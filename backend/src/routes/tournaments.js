async function tournamentsRoutes(app, opts) {
	const { db } = app;

	// GET /api/tournaments - Get all public tournaments
	app.get('/api/tournaments', async (req, reply) => {
		const uid = req.session.uid;
		
		try {
			const tournaments = db.prepare(`
				SELECT t.*, 
							 u.display_name as creator_name,
							 COUNT(tp.id) as current_players,
							 CASE WHEN tp_user.id IS NOT NULL THEN 1 ELSE 0 END as is_joined,
							 CASE WHEN t.creator_id = ? THEN 1 ELSE 0 END as is_creator
				FROM tournaments t
				LEFT JOIN users u ON t.creator_id = u.id
				LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
				LEFT JOIN tournament_participants tp_user ON t.id = tp_user.tournament_id AND tp_user.user_id = ?
				WHERE t.is_public = 1
				GROUP BY t.id
				ORDER BY t.created_at DESC
			`).all(uid || 0, uid || 0);

			return tournaments;
		} catch (error) {
			return reply.code(500).send({ error: 'Error fetching tournaments' });
		}
	});

	// POST /api/tournaments - Create a new tournament
	app.post('/api/tournaments', async (req, reply) => {
		const uid = req.session.uid;
		if (!uid) {
			return reply.code(401).send({ error: 'Not authenticated' });
		}

		const { name, maxPlayers, isPublic = true } = req.body;
		
		if (!name || !maxPlayers) {
			return reply.code(400).send({ error: 'Name and maxPlayers are required' });
		}

		if (![4, 8, 16, 32].includes(maxPlayers)) {
			return reply.code(400).send({ error: 'maxPlayers must be 4, 8, 16, or 32' });
		}

		try {
			const result = db.prepare(`
				INSERT INTO tournaments (name, max_players, is_public, creator_id)
				VALUES (?, ?, ?, ?)
			`).run(name, maxPlayers, isPublic ? 1 : 0, uid);

			const tournament = db.prepare(`
				SELECT t.*, u.display_name as creator_name
				FROM tournaments t
				LEFT JOIN users u ON t.creator_id = u.id
				WHERE t.id = ?  
			`).get(result.lastInsertRowid);

			return tournament;
		} catch (error) {
			return reply.code(500).send({ error: 'Error creating tournament' });
		}
	});

	// POST /api/tournaments/:id/join - Join a tournament
	app.post('/api/tournaments/:id/join', async (req, reply) => {
		const uid = req.session.uid;
		if (!uid) {
			return reply.code(401).send({ error: 'Not authenticated' });
		}

		const tournamentId = parseInt(req.params.id);
		const { alias } = req.body;

		if (!alias || alias.trim().length === 0) {
			return reply.code(400).send({ error: 'Alias is required' });
		}

		try {
			// Check if tournament exists and is joinable
			const tournament = db.prepare(`
				SELECT * FROM tournaments WHERE id = ? AND status = 'registration'
			`).get(tournamentId);

			if (!tournament) {
				return reply.code(404).send({ error: 'Tournament not found or not accepting registrations' });
			}

			// Check if user already joined
			const existingParticipant = db.prepare(`
				SELECT * FROM tournament_participants WHERE tournament_id = ? AND user_id = ?
			`).get(tournamentId, uid);

			if (existingParticipant) {
				return reply.code(400).send({ error: 'Already joined this tournament' });
			}

			// Check if tournament is full
			const currentPlayers = db.prepare(`
				SELECT COUNT(*) as count FROM tournament_participants WHERE tournament_id = ?
			`).get(tournamentId);

			if (currentPlayers.count >= tournament.max_players) {
				return reply.code(400).send({ error: 'Tournament is full' });
			}

			// Check if alias is already taken in this tournament
			const aliasExists = db.prepare(`
				SELECT * FROM tournament_participants WHERE tournament_id = ? AND alias = ?
			`).get(tournamentId, alias.trim());

			if (aliasExists) {
				return reply.code(400).send({ error: 'Alias already taken in this tournament' });
			}

			// Add participant
			const result = db.prepare(`
				INSERT INTO tournament_participants (tournament_id, user_id, alias)
				VALUES (?, ?, ?)
			`).run(tournamentId, uid, alias.trim());

			// Get updated participant count
			const updatedCount = db.prepare(`
				SELECT COUNT(*) as count FROM tournament_participants WHERE tournament_id = ?
			`).get(tournamentId);

			return { success: true, participantId: result.lastInsertRowid };
		} catch (error) {
			console.error('Error joining tournament:', error);
			return reply.code(500).send({ error: 'Error joining tournament' });
		}
	});

	// GET /api/tournaments/:id - Get tournament details
	app.get('/api/tournaments/:id', async (req, reply) => {
  const uid = req.session.uid;
  // Debug logs removed for production

  if (!uid) {
    return reply.code(401).send({ error: 'Not authenticated' });
  }

  const tournamentId = parseInt(req.params.id);
  try {
    // Get tournament with is_joined and is_creator flags
    const tournament = db.prepare(`
      SELECT t.*,
        u.display_name as creator_name,
        COUNT(DISTINCT tp.id) as current_players,
        CASE WHEN tp_user.user_id IS NOT NULL THEN 1 ELSE 0 END as is_joined,
        CASE WHEN t.creator_id = ? THEN 1 ELSE 0 END as is_creator
      FROM tournaments t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
      LEFT JOIN tournament_participants tp_user ON t.id = tp_user.tournament_id AND tp_user.user_id = ?
      WHERE t.id = ?
      GROUP BY t.id
    `).get(uid, uid, tournamentId);

    console.log('Tournament query result:', tournament);
    if (!tournament) {
      console.log('Tournament not found');
      return reply.code(404).send({ error: 'Tournament not found' });
    }

    console.log('Getting participants...');
    const participants = db.prepare(`
      SELECT tp.*, u.display_name, u.email
      FROM tournament_participants tp
      LEFT JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id = ?
      ORDER BY tp.joined_at ASC
    `).all(tournamentId);

    console.log('Participants:', participants);

    let matches = [];
    if (tournament.status === 'active' || tournament.status === 'completed' || tournament.status === 'finished') {
      console.log('Getting matches...');
      
      // CORREGIR LA CONSULTA PARA INCLUIR LOS PARTICIPANT IDs
	  matches = db.prepare(`
        SELECT tm.*,
          p1.alias as player1_alias, p1.id as player1_participant_id, p1.user_id as player1_user_id,
          p2.alias as player2_alias, p2.id as player2_participant_id, p2.user_id as player2_user_id,
          winner.alias as winner_alias, winner.id as winner_participant_id
        FROM tournament_matches tm
        LEFT JOIN tournament_participants p1 ON tm.player1_id = p1.id
        LEFT JOIN tournament_participants p2 ON tm.player2_id = p2.id
        LEFT JOIN tournament_participants winner ON tm.winner_id = winner.id
        WHERE tm.tournament_id = ?
        ORDER BY tm.round ASC, tm.position ASC
      `).all(tournamentId);
      
      console.log('Matches with participant IDs:', matches);
    }

    tournament.participants = participants;
    tournament.matches = matches;
    console.log('Final tournament object:', tournament);
    console.log('=== END GET TOURNAMENT DETAILS ===');

    reply.send(tournament);
  } catch (error) {
    console.error('Error fetching tournament details:', error);
    return reply.code(500).send({ error: 'Error fetching tournament details', details: error.message });
  }
});

// POST /api/tournaments/:id/start - Manually start a tournament
	app.post('/api/tournaments/:id/start', async (req, reply) => {
		const { id } = req.params;
		const uid = req.session?.uid;

		if (!uid) {
			return reply.code(401).send({ error: 'Not authenticated' });
		}

		try {
			// Get tournament details and verify creator
			const tournament = db.prepare(
				'SELECT * FROM tournaments WHERE id = ? AND creator_id = ?'
			).get(id, uid);

			if (!tournament) {
				return reply.code(404).send({ error: 'Tournament not found or you are not the creator' });
			}

			if (tournament.status !== 'registration') {
				return reply.code(400).send({ error: 'Tournament is not in registration phase' });
			}

			// Get all participants with user details
			const participants = db.prepare(`
				SELECT tp.*, u.display_name 
				FROM tournament_participants tp
				LEFT JOIN users u ON tp.user_id = u.id
				WHERE tp.tournament_id = ?
			`).all(id);

			if (participants.length < 2) {
				return reply.code(400).send({ error: 'Need at least 2 participants to start tournament' });
			}

			// Check if tournament is full
			if (participants.length !== tournament.max_players) {
				return reply.code(400).send({ error: 'Tournament must be full to start' });
			}

			// Shuffle participants randomly
			const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);

			// Create first round matches
			const matches = [];
			let position = 1;

			for (let i = 0; i < shuffledParticipants.length; i += 2) {
				const player1 = shuffledParticipants[i];
				const player2 = shuffledParticipants[i + 1] || null;

				// Insert match into database
				const matchResult = db.prepare(`
					INSERT INTO tournament_matches 
					(tournament_id, player1_id, player2_id, round, position) 
					VALUES (?, ?, ?, ?, ?)
				`).run(id, player1?.id || null, player2?.id || null, 1, position);

				matches.push({
					id: matchResult.lastInsertRowid,
					player1,
					player2,
					round: 1,
					position
				});

				position++;
			}

			// Update tournament status
			db.prepare(
				'UPDATE tournaments SET status = ?, current_round = ? WHERE id = ?'
			).run('active', 1, id);

			// Send notifications to all participants about their matches
			for (const match of matches) {
				if (match.player1) {
					await sendTournamentNotification(app, match.player1.user_id, tournament.name, 1, match.player2?.alias || 'BYE');
				}
				if (match.player2) {
					await sendTournamentNotification(app, match.player2.user_id, tournament.name, 1, match.player1?.alias || 'BYE');
				}
			}

			return reply.send({ 
				success: true, 
				message: 'Tournament started successfully!',
				matches: matches.length,
				participants: shuffledParticipants.length
			});

		} catch (error) {
			console.error('Error starting tournament:', error);
			return reply.code(500).send({ error: 'Failed to start tournament' });
		}
	});

	// DELETE /api/tournaments/:id/leave - Leave a tournament
	app.delete('/api/tournaments/:id/leave', async (req, reply) => {
		const uid = req.session.uid;
		if (!uid) {
			return reply.code(401).send({ error: 'Not authenticated' });
		}

		const tournamentId = parseInt(req.params.id);

		try {
			// Check if tournament exists and is still in registration
			const tournament = db.prepare(`
				SELECT * FROM tournaments WHERE id = ? AND status = 'registration'
			`).get(tournamentId);

			if (!tournament) {
				return reply.code(404).send({ error: 'Tournament not found or already started' });
			}

			// Check if user is actually in the tournament
			const participant = db.prepare(`
				SELECT * FROM tournament_participants WHERE tournament_id = ? AND user_id = ?
			`).get(tournamentId, uid);

			if (!participant) {
				return reply.code(400).send({ error: 'You are not in this tournament' });
			}

			// Remove participant
			db.prepare(`
				DELETE FROM tournament_participants WHERE tournament_id = ? AND user_id = ?
			`).run(tournamentId, uid);

			return { success: true };
		} catch (error) {
			console.error('Error leaving tournament:', error);
			return reply.code(500).send({ error: 'Error leaving tournament' });
		}
	});

	// DELETE /api/tournaments/:id - Delete a tournament (only creator can delete)
	app.delete('/api/tournaments/:id', async (req, reply) => {
		const uid = req.session.uid;
		if (!uid) {
			return reply.code(401).send({ error: 'Not authenticated' });
		}

		const tournamentId = parseInt(req.params.id);
		if (!tournamentId) {
			return reply.code(400).send({ error: 'Invalid tournament ID' });
		}

		try {
			// Check if tournament exists and user is the creator
			const tournament = db.prepare(`
				SELECT * FROM tournaments WHERE id = ? AND creator_id = ?
			`).get(tournamentId, uid);

			if (!tournament) {
				return reply.code(404).send({ error: 'Tournament not found or you are not the creator' });
			}

			// Check if tournament is still in registration phase
			if (tournament.status !== 'registration') {
				return reply.code(400).send({ error: 'Can only delete tournaments in registration phase' });
			}

			// Delete tournament and all related data (cascade delete)
			const deleteTransaction = db.transaction(() => {
				// Delete tournament matches
				db.prepare('DELETE FROM tournament_matches WHERE tournament_id = ?').run(tournamentId);
				
				// Delete tournament participants
				db.prepare('DELETE FROM tournament_participants WHERE tournament_id = ?').run(tournamentId);
				
				// Delete the tournament itself
				db.prepare('DELETE FROM tournaments WHERE id = ?').run(tournamentId);
			});

			deleteTransaction();

			return { success: true, message: 'Tournament deleted successfully' };
		} catch (error) {
			console.error('Error deleting tournament:', error);
			return reply.code(500).send({ error: 'Error deleting tournament' });
		}
	});

	app.get('/api/tournaments/:id/can-start', async (req, res) => {
		const { id } = req.params;
		const uid = req.session?.uid;

		if (!uid) {
			return res.status(401).json({ error: 'Not authenticated' });
		}

		try {
			const tournament = await fastify.db.get(
				'SELECT * FROM tournaments WHERE id = ? AND creator_id = ?',
				[id, uid]
			);

			if (!tournament) {
				return res.status(404).json({ error: 'Tournament not found or you are not the creator' });
			}

			const participants = await fastify.db.all(
				'SELECT COUNT(*) as count FROM tournament_participants WHERE tournament_id = ?',
				[id]
			);

			const canStart = tournament.status === 'registration' && 
											participants[0].count >= 2 && 
											participants[0].count === tournament.max_players;

			res.json({ 
				canStart, 
				currentPlayers: participants[0].count,
				maxPlayers: tournament.max_players,
				status: tournament.status
			});

		} catch (error) {
			console.error('Error checking tournament start eligibility:', error);
			res.status(500).json({ error: 'Failed to check tournament status' });
		}
	});

	// GET /api/tournaments/:tournamentId/matches/:matchId - Get specific match details
	app.get('/api/tournaments/:tournamentId/matches/:matchId', async (req, reply) => {
		const { tournamentId, matchId } = req.params;
		const uid = req.session?.uid;

		if (!uid) {
			return reply.code(401).send({ error: 'Not authenticated' });
		}

		try {
			// Verificar que el usuario esté en este match
			const match = db.prepare(`
				SELECT tm.*,
							 p1.user_id as player1_user_id, p1.alias as player1_alias,
							 p2.user_id as player2_user_id, p2.alias as player2_alias,
							 w.alias as winner_alias
				FROM tournament_matches tm
				LEFT JOIN tournament_participants p1 ON tm.player1_id = p1.id
				LEFT JOIN tournament_participants p2 ON tm.player2_id = p2.id
				LEFT JOIN tournament_participants w ON tm.winner_id = w.id
				WHERE tm.tournament_id = ? AND tm.id = ?
			`).get(tournamentId, matchId);

			if (!match) {
				return reply.code(404).send({ error: 'Match not found' });
			}

			// Verificar que el usuario actual esté en este match
			if (match.player1_user_id !== uid && match.player2_user_id !== uid) {
				return reply.code(403).send({ error: 'You are not a participant in this match' });
			}

			// Convertir IDs de participantes a IDs de usuarios para el frontend
			return {
				match: {
					...match,
					player1_id: match.player1_user_id,
					player2_id: match.player2_user_id
				}
			};
		} catch (error) {
			console.error('Error fetching match details:', error);
			return reply.code(500).send({ error: 'Error fetching match details' });
		}
	});

	// POST /api/tournaments/:tournamentId/matches/:matchId/result - Update match result
	app.post('/api/tournaments/:tournamentId/matches/:matchId/result', async (req, reply) => {
		const uid = req.session.uid;
		if (!uid) {
			return reply.code(401).send({ error: 'Not authenticated' });
		}
		const tournamentId = parseInt(req.params.tournamentId);
		const matchId = parseInt(req.params.matchId);
		const { winnerId, scorePlayer1 = 0, scorePlayer2 = 0 } = req.body;

		if (!winnerId) {
			return reply.code(400).send({ error: 'Winner ID is required' });
		}

		try {
			const match = db.prepare(`
				SELECT tm.*, t.status, t.current_round
				FROM tournament_matches tm
				JOIN tournaments t ON tm.tournament_id = t.id
				WHERE tm.id = ? AND tm.tournament_id = ?
			`).get(matchId, tournamentId);

			if (!match) {
				return reply.code(404).send({ error: 'Match not found' });
			}

			if (match.status !== 'active') {
				return reply.code(400).send({ error: 'Tournament is not active' });
			}

			if (match.winner_id) {
				return reply.code(400).send({ error: 'Match already completed' });
			}

			if (winnerId !== match.player1_id && winnerId !== match.player2_id) {
				return reply.code(400).send({ error: 'Winner must be one of the match players' });
			}

			db.prepare(`
				UPDATE tournament_matches
				SET winner_id = ?, score_player1 = ?, score_player2 = ?, played_at = datetime('now')
				WHERE id = ?
			`).run(winnerId, scorePlayer1, scorePlayer2, matchId);

			await autoAdvanceRoundIfComplete(app, db, tournamentId, match.current_round);

			reply.send({ message: 'Match result updated successfully' });
		} catch (error) {
			console.error('Error updating match result: ', error);
			reply.code(500).send({ error: 'Error updating match result' });
		}
	});

	async function autoAdvanceRoundIfComplete(app, db, tournamentId, currentRound) {
		try {
			const incompleteMatches = db.prepare(`
				SELECT COUNT(*) as count
				FROM tournament_matches
				WHERE tournament_id = ? AND round = ? AND winner_id IS NULL
			`).get(tournamentId, currentRound);
			
			if (incompleteMatches.count > 0) {
				console.log(`Tournament ${tournamentId}: Round ${currentRound} has ${incompleteMatches.count} incomplete matches`);
				return;
			}

			const winners = db.prepare(`
				SELECT winner_id FROM tournament_matches
				WHERE tournament_id = ? AND round = ? AND winner_id IS NOT NULL
			`).all(tournamentId, currentRound);

			console.log(`Tournament ${tournamentId}: Round ${currentRound} complete with ${winners.length} winners`);
			
			if (winners.length <= 1) {
				const winnerId = winners.length === 1 ? winners[0].winner_id : null;

				db.prepare(`
					UPDATE tournaments
					SET status = 'finished', winner_id = ?, completed_at = datetime('now')
					WHERE id = ?
				`).run(winnerId, tournamentId);

				console.log(`Tournament ${tournamentId} finished with winner: ${winnerId}`);

				const participants = db.prepare(`
					SELECT user_id FROM tournament_participants WHERE tournament_id = ?
				`).all(tournamentId);

				for (const participant of participants) {
					if (app.websocketPush) {
						app.websocketPush(participant.user_id, {
							type: 'tournament_finished',
							tournamentId,
							winnerId
						});
					}
				}

				return;
			}
			
			const nextRound = currentRound + 1;
			const nextMatches = [];

			for (let i = 0; i < winners.length; i += 2) {
				if (i + 1 < winners.length) {
					nextMatches.push({
						round: nextRound,
						position: Math.floor(i / 2) + 1,
						player1_id: winners[i].winner_id,
						player2_id: winners[i + 1].winner_id,
					});
				}
			}
			const insertMatch = db.prepare(`
				INSERT INTO tournament_matches (tournament_id, round, position, player1_id, player2_id)
				VALUES(?, ?, ?, ?, ?)
			`);

			for (const match of nextMatches) {
				insertMatch.run(tournamentId, match.round, match.position, match.player1_id, match.player2_id);
			}

			db.prepare(`
				UPDATE tournaments SET current_round = ? WHERE id = ?
			`).run(nextRound, tournamentId);

			console.log(`Tournament ${tournamentId}: Advanced to round ${nextRound} with ${nextMatches.length} matches`);

			const advancedPlayerIds = nextMatches.flatMap(m => [m.player1_id, m.player2_id]);
			for (const playerId of advancedPlayerIds) {
				const participant = db.prepare(`
					SELECT user_id FROM tournament_participants WHERE id = ?
				`).get(playerId);

				if (participant && app.websocketPush) {
					app.websocketPush(participant.user_id, {
						type: 'tournament_round_advanced',
						tournamentId,
						newRound: nextRound
					});
				}
			}
		} catch (error) {
			console.error('Error in autoAdvanceRoundIfComplete:', error);
		}
	}

	// GET /api/tournaments/:id/can-advance-round - Check if tournament can advance to next round
	app.get('/api/tournaments/:id/can-advance-round', async (req, reply) => {
		const { id } = req.params;
		const uid = req.session?.uid;

		if (!uid) {
			return reply.code(401).send({ error: 'Not authenticated' });
		}

		try {
			// Verificar que el usuario sea el creador del torneo
			const tournament = db.prepare(`
				SELECT * FROM tournaments WHERE id = ? AND creator_id = ?
			`).get(id, uid);

			if (!tournament) {
				return reply.code(404).send({ error: 'Tournament not found or you are not the creator' });
			}

			if (tournament.status !== 'active') {
				return reply.code(400).send({ error: 'Tournament is not active' });
			}

			// Verificar si todas las partidas de la ronda actual están completadas
			const incompleteMatches = db.prepare(`
				SELECT COUNT(*) as count
				FROM tournament_matches
				WHERE tournament_id = ? AND round = ? AND winner_id IS NULL
			`).get(id, tournament.current_round);

			// Obtener ganadores de la ronda actual
			const winners = db.prepare(`
				SELECT winner_id FROM tournament_matches
				WHERE tournament_id = ? AND round = ? AND winner_id IS NOT NULL
			`).all(id, tournament.current_round);

			const canAdvance = incompleteMatches.count === 0 && winners.length > 1;
			const isCompleted = incompleteMatches.count === 0 && winners.length <= 1;

			return {
				canAdvance,
				isCompleted,
				currentRound: tournament.current_round,
				incompleteMatches: incompleteMatches.count,
				winners: winners.length
			};
		} catch (error) {
			console.error('Error checking tournament advancement:', error);
			return reply.code(500).send({ error: 'Error checking tournament advancement' });
		}
	});

	// POST /api/tournaments/:id/advance-round - Advance tournament to next round
	app.post('/api/tournaments/:id/advance-round', async (req, reply) => {
		const { id } = req.params;
		const uid = req.session?.uid;

		if (!uid) {
			return reply.code(401).send({ error: 'Not authenticated' });
		}

		try {
			// Verificar que el usuario sea el creador del torneo
			const tournament = db.prepare(`
				SELECT * FROM tournaments WHERE id = ? AND creator_id = ?
			`).get(id, uid);

			if (!tournament) {
				return reply.code(404).send({ error: 'Tournament not found or you are not the creator' });
			}

			if (tournament.status !== 'active') {
				return reply.code(400).send({ error: 'Tournament is not active' });
			}

			// Verificar si todas las partidas de la ronda actual están completadas
			const incompleteMatches = db.prepare(`
				SELECT COUNT(*) as count
				FROM tournament_matches
				WHERE tournament_id = ? AND round = ? AND winner_id IS NULL
			`).get(id, tournament.current_round);

			if (incompleteMatches.count > 0) {
				return reply.code(400).send({ 
					error: `There are still ${incompleteMatches.count} incomplete matches in round ${tournament.current_round}` 
				});
			}

			// Obtener ganadores de la ronda actual
			const winners = db.prepare(`
				SELECT winner_id FROM tournament_matches
				WHERE tournament_id = ? AND round = ? AND winner_id IS NOT NULL
			`).all(id, tournament.current_round);

			if (winners.length <= 1) {
				// Torneo completado
				if (winners.length === 1) {
					const winner = db.prepare(`
						SELECT tp.user_id, u.display_name 
						FROM tournament_participants tp
						JOIN users u ON tp.user_id = u.id
						WHERE tp.id = ?
					`).get(winners[0].winner_id);

					db.prepare(`
						UPDATE tournaments 
						SET status = 'finished', winner_id = ?, completed_at = datetime('now')
						WHERE id = ?
					`).run(winner.user_id, id);

					return reply.send({ 
						success: true, 
						message: 'Tournament completed!',
						isCompleted: true,
						winnerId: winner.user_id,
						winnerName: winner.display_name
					});
				} else {
					return reply.code(400).send({ error: 'No winners found in current round' });
				}
			}

			// Crear partidas de la siguiente ronda
			const nextRound = tournament.current_round + 1;
			
			// Barajar ganadores aleatoriamente para la siguiente ronda
			const shuffledWinners = [...winners].sort(() => Math.random() - 0.5);
			const nextMatches = [];
			let position = 1;

			for (let i = 0; i < shuffledWinners.length; i += 2) {
				const player1 = shuffledWinners[i];
				const player2 = shuffledWinners[i + 1] || null;

				const matchResult = db.prepare(`
					INSERT INTO tournament_matches (tournament_id, round, position, player1_id, player2_id)
					VALUES (?, ?, ?, ?, ?)
				`).run(id, nextRound, position, player1.winner_id, player2?.winner_id || null);

				nextMatches.push({
					id: matchResult.lastInsertRowid,
					round: nextRound,
					position,
					player1_id: player1.winner_id,
					player2_id: player2?.winner_id || null
				});

				position++;
			}

			// Actualizar la ronda actual del torneo
			db.prepare(`
				UPDATE tournaments SET current_round = ? WHERE id = ?
			`).run(nextRound, id);

			// Enviar notificaciones a los jugadores de la nueva ronda
			for (const match of nextMatches) {
				if (match.player1_id && match.player2_id) {
					setTimeout(async () => {
						try {
							// Obtener información de los jugadores para las notificaciones
							const matchInfo = db.prepare(`
								SELECT tm.*, 
											 t.name as tournament_name,
											 p1.alias as player1_alias, p1.user_id as player1_user_id,
											 p2.alias as player2_alias, p2.user_id as player2_user_id
								FROM tournament_matches tm
								JOIN tournaments t ON tm.tournament_id = t.id
								JOIN tournament_participants p1 ON tm.player1_id = p1.id
								JOIN tournament_participants p2 ON tm.player2_id = p2.id
								WHERE tm.id = ?
							`).get(match.id);

							if (matchInfo) {
								await sendTournamentNotification(app, matchInfo.player1_user_id, matchInfo.tournament_name, nextRound, matchInfo.player2_alias);
								await sendTournamentNotification(app, matchInfo.player2_user_id, matchInfo.tournament_name, nextRound, matchInfo.player1_alias);
							}
						} catch (error) {
							console.error('Error sending notifications for new round:', error);
						}
					}, 1000);
				}
			}

			return reply.send({ 
				success: true, 
				message: `Tournament advanced to round ${nextRound}!`,
				newRound: nextRound,
				matches: nextMatches.length,
				isCompleted: false
			});

		} catch (error) {
			console.error('Error advancing tournament round:', error);
			return reply.code(500).send({ error: 'Error advancing tournament round' });
		}
	});
}

// Helper function to start a tournament
async function startTournament(app, db, tournamentId) {
	// Get tournament info
	const tournament = db.prepare(`
		SELECT * FROM tournaments WHERE id = ?
	`).get(tournamentId);

	// Get all participants
	const participants = db.prepare(`
		SELECT * FROM tournament_participants WHERE tournament_id = ? ORDER BY joined_at
	`).all(tournamentId);

	if (participants.length < 2) {
		throw new Error('Not enough participants');
	}

	// Shuffle participants for random bracket
	const shuffled = [...participants].sort(() => Math.random() - 0.5);

	// Create first round matches
	const matches = [];
	for (let i = 0; i < shuffled.length; i += 2) {
		const player1 = shuffled[i];
		const player2 = shuffled[i + 1] || null; // Handle odd number of players

		matches.push({
			tournament_id: tournamentId,
			round: 1,
			position: Math.floor(i / 2),
			player1_id: player1.id,
			player2_id: player2?.id || null
		});
	}

	// Insert matches
	const insertMatch = db.prepare(`
		INSERT INTO tournament_matches (tournament_id, round, position, player1_id, player2_id)
		VALUES (?, ?, ?, ?, ?)
	`);

	for (const match of matches) {
		const result = insertMatch.run(match.tournament_id, match.round, match.position, match.player1_id, match.player2_id);
		
		// Notificar a los jugadores de su primer partido si ambos existen
		if (match.player1_id && match.player2_id) {
			const matchId = result.lastInsertRowid;
			
			// Notificar inmediatamente para el primer partido
			setTimeout(async () => {
				if (app.notifyMatchReady) {
					await app.notifyMatchReady(tournamentId, matchId);
				}
			}, 1000); // Pequeño delay para asegurar que la transacción se complete
		}
	}

	// Update tournament status
	db.prepare(`
		UPDATE tournaments 
		SET status = 'active', started_at = datetime('now')
		WHERE id = ?
	`).run(tournamentId);
}

// Helper function to advance to next round if current round is complete
async function advanceRoundIfComplete(app, db, tournamentId, currentRound) {
	// Check if all matches in current round are complete
	const incompleteMatches = db.prepare(`
		SELECT COUNT(*) as count
		FROM tournament_matches
		WHERE tournament_id = ? AND round = ? AND winner_id IS NULL
	`).get(tournamentId, currentRound);

	if (incompleteMatches.count > 0) {
		return; // Round not complete yet
	}

	// Get winners of current round
	const winners = db.prepare(`
		SELECT winner_id FROM tournament_matches
		WHERE tournament_id = ? AND round = ? AND winner_id IS NOT NULL
	`).all(tournamentId, currentRound);

	if (winners.length <= 1) {
		// Tournament complete
		if (winners.length === 1) {
			const winner = db.prepare(`
				SELECT tp.user_id, u.display_name 
				FROM tournament_participants tp
				JOIN users u ON tp.user_id = u.id
				WHERE tp.id = ?
			`).get(winners[0].winner_id);

			db.prepare(`
				UPDATE tournaments 
				SET status = 'finished', winner_id = ?, completed_at = datetime('now')
				WHERE id = ?
			`).run(winner.user_id, tournamentId);
		}
		return;
	}

	// Create next round matches
	const nextRound = currentRound + 1;
	const nextMatches = [];

	for (let i = 0; i < winners.length; i += 2) {
		const player1 = winners[i];
		const player2 = winners[i + 1] || null;

		nextMatches.push({
			tournament_id: tournamentId,
			round: nextRound,
			position: Math.floor(i / 2),
			player1_id: player1.winner_id,
			player2_id: player2?.winner_id || null
		});
	}

	// Insert next round matches
	const insertMatch = db.prepare(`
		INSERT INTO tournament_matches (tournament_id, round, position, player1_id, player2_id)
		VALUES (?, ?, ?, ?, ?)
	`);

	for (const match of nextMatches) {
		const result = insertMatch.run(match.tournament_id, match.round, match.position, match.player1_id, match.player2_id);
		
		// Notificar a los jugadores de su nuevo partido si ambos existen
		if (match.player1_id && match.player2_id) {
			const matchId = result.lastInsertRowid;
			
			// Notificar con un pequeño delay
			setTimeout(async () => {
				if (app.notifyMatchReady) {
					await app.notifyMatchReady(tournamentId, matchId);
				}
			}, 1000);
		}
	}

	// Update tournament current round
	db.prepare(`
		UPDATE tournaments SET current_round = ? WHERE id = ?
	`).run(nextRound, tournamentId);
}

// SISTEMA DE NOTIFICACIONES PARA TORNEOS
async function notifyTournamentMatch(app, userId, tournamentName, opponentName, round) {
	try {
		const message = `🏆 ¡Es tu turno en el torneo "${tournamentName}"! Tu oponente es ${opponentName} (Ronda ${round}). ¡Ve a jugar tu partido!`;
		
		// Usar la función del sistema de chat
		if (app.sendSystemNotification) {
			await app.sendSystemNotification(userId, message, 'tournament');
			app.log.info(`Tournament notification sent to user ${userId}`);
		} else {
			app.log.error('sendSystemNotification function not available');
		}
	} catch (error) {
		app.log.error('Error sending tournament notification:', error);
	}
}

// Función para notificar a los jugadores cuando comienza su turno
async function notifyMatchReady(app, tournamentId, matchId) {
	try {
		const match = app.db.prepare(`
			SELECT tm.*, 
						 t.name as tournament_name,
						 p1.alias as player1_alias,
						 p2.alias as player2_alias,
						 tp1.user_id as player1_user_id,
						 tp2.user_id as player2_user_id
			FROM tournament_matches tm
			JOIN tournaments t ON tm.tournament_id = t.id
			LEFT JOIN tournament_participants tp1 ON tm.player1_id = tp1.id
			LEFT JOIN tournament_participants tp2 ON tm.player2_id = tp2.id
			LEFT JOIN tournament_participants p1 ON tm.player1_id = p1.id
			LEFT JOIN tournament_participants p2 ON tm.player2_id = p2.id
			WHERE tm.id = ?
		`).get(matchId);

		if (match && match.player1_user_id && match.player2_user_id) {
			// Notificar a ambos jugadores
			await notifyTournamentMatch(app, match.player1_user_id, match.tournament_name, match.player2_alias, match.round);
			await notifyTournamentMatch(app, match.player2_user_id, match.tournament_name, match.player1_alias, match.round);
		}
	} catch (error) {
		app.log.error('Error notifying match ready:', error);
	}
}

// Add helper function for tournament notifications
async function sendTournamentNotification(app, userId, tournamentName, round, opponentAlias) {
	try {
		const message = `🏆 ¡Es tu turno! Juega en la ronda ${round} del torneo "${tournamentName}" contra ${opponentAlias}`;
		
		const result = app.db.prepare(
			`INSERT INTO messages (sender_id, receiver_id, body, kind, created_at) 
			 VALUES (?, ?, ?, ?, datetime('now'))`
		).run(0, userId, message, 'system'); // sender_id = 0 is System

		// Emit real-time notification if user is online
		const connections = app.websocketConnections || {};
		if (connections[userId]) {
			connections[userId].send(JSON.stringify({
				type: 'new_message',
				message: {
					id: result.lastInsertRowid,
					sender_id: 0,
					sender_name: 'System',
					body: message,
					kind: 'system',
					created_at: new Date().toISOString()
				}
			}));
		}

		return { success: true, messageId: result.lastInsertRowid };
	} catch (error) {
		console.error('Error sending tournament notification:', error);
		throw error;
	}
}

// Exponer las funciones de notificación
function setupTournamentNotifications(app) {
	app.decorate('notifyTournamentMatch', (userId, tournamentName, opponentName, round) => 
		notifyTournamentMatch(app, userId, tournamentName, opponentName, round)
	);
	app.decorate('notifyMatchReady', (tournamentId, matchId) => 
		notifyMatchReady(app, tournamentId, matchId)
	);
}

module.exports = tournamentsRoutes;
module.exports.setupTournamentNotifications = setupTournamentNotifications;
