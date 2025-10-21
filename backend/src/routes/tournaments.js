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
				WHERE t.is_public = 1 AND t.status != 'finished'
				GROUP BY t.id
				ORDER BY t.created_at DESC
			`).all(uid || 0, uid || 0);

			return tournaments;
		} catch (error) {
			return reply.code(500).send({ error: 'Error fetching tournaments' });
		}
	});

	// GET /api/tournaments/history - Get tournament history for current user
	app.get('/api/tournaments/history', async (req, reply) => {
		const uid = req.session.uid;
		if (!uid) {
			return reply.code(401).send({ error: 'Not authenticated' });
		}
		
		try {
			const tournaments = db.prepare(`
				SELECT t.*, 
							 u.display_name as creator_name,
							 COUNT(DISTINCT tp.id) as total_players,
							 CASE WHEN tp_user.id IS NOT NULL THEN 1 ELSE 0 END as was_participant,
							 CASE WHEN t.creator_id = ? THEN 1 ELSE 0 END as was_creator,
							 CASE WHEN t.winner_id = ? THEN 1 ELSE 0 END as was_winner,
							 winner_u.display_name as winner_name
				FROM tournaments t
				LEFT JOIN users u ON t.creator_id = u.id
				LEFT JOIN users winner_u ON t.winner_id = winner_u.id
				LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
				LEFT JOIN tournament_participants tp_user ON t.id = tp_user.tournament_id AND tp_user.user_id = ?
				WHERE t.status = 'finished' 
				  AND (tp_user.id IS NOT NULL OR t.creator_id = ?)
				GROUP BY t.id
				ORDER BY t.completed_at DESC, t.created_at DESC
			`).all(uid, uid, uid, uid);

			return tournaments;
		} catch (error) {
			console.error('Error fetching tournament history:', error);
			return reply.code(500).send({ error: 'Error fetching tournament history' });
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

		try {
			// Get user's display_name
			const user = db.prepare(`
				SELECT display_name FROM users WHERE id = ?
			`).get(uid);

			if (!user || !user.display_name) {
				return reply.code(400).send({ error: 'User not found or missing display name' });
			}

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

			// Check if display_name is already taken in this tournament (unlikely but possible)
			const nameExists = db.prepare(`
				SELECT * FROM tournament_participants WHERE tournament_id = ? AND alias = ?
			`).get(tournamentId, user.display_name);

			if (nameExists) {
				return reply.code(400).send({ error: 'A user with the same display name is already in this tournament' });
			}

			// Add participant using display_name as alias
			const result = db.prepare(`
				INSERT INTO tournament_participants (tournament_id, user_id, alias)
				VALUES (?, ?, ?)
			`).run(tournamentId, uid, user.display_name);

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
        winner_u.display_name as winner_name,
        COUNT(DISTINCT tp.id) as current_players,
        CASE WHEN tp_user.user_id IS NOT NULL THEN 1 ELSE 0 END as is_joined,
        CASE WHEN t.creator_id = ? THEN 1 ELSE 0 END as is_creator
      FROM tournaments t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN users winner_u ON t.winner_id = winner_u.id
      LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
      LEFT JOIN tournament_participants tp_user ON t.id = tp_user.tournament_id AND tp_user.user_id = ?
      WHERE t.id = ?
      GROUP BY t.id
    `).get(uid, uid, tournamentId);

    if (!tournament) {
      return reply.code(404).send({ error: 'Tournament not found' });
    }
    const participants = db.prepare(`
      SELECT tp.*, u.display_name, u.email
      FROM tournament_participants tp
      LEFT JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id = ?
      ORDER BY tp.joined_at ASC
    `).all(tournamentId);

    let matches = [];
    if (tournament.status === 'active' || tournament.status === 'completed' || tournament.status === 'finished') {
      
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
    }

    tournament.participants = participants;
    tournament.matches = matches;

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

			// Get all participants
			const participants = db.prepare(`
				SELECT tp.*, u.display_name 
				FROM tournament_participants tp
				LEFT JOIN users u ON tp.user_id = u.id
				WHERE tp.tournament_id = ?
			`).all(id);

			if (participants.length < 2) {
				return reply.code(400).send({ error: 'Need at least 2 participants to start tournament' });
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

			// Notify participants about the tournament start
			// MODIFICADO: Usar el placeholder {tournamentName}
			await notifyParticipants(app, id, `🏆 ¡El torneo "{tournamentName}" ha comenzado! Revisa los emparejamientos.`);

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

	// POST /api/tournaments/:tournamentId/matches/:matchId/verify-opponent - Verify opponent authentication for match
	app.post('/api/tournaments/:tournamentId/matches/:matchId/verify-opponent', async (req, reply) => {
		const uid = req.session.uid;
		
		if (!uid) {
			return reply.code(401).send({ error: 'Not authenticated' });
		}

		const { email, password } = req.body;
		
		if (!email || !password) {
			return reply.code(400).send({ error: 'Email and password are required' });
		}
		
		const tournamentId = parseInt(req.params.tournamentId);
		const matchId = parseInt(req.params.matchId);
		console.log('Tournament ID:', tournamentId, 'Match ID:', matchId);
		
		try {
			// Get match details and verify current user is in this match
			const match = db.prepare(`
				SELECT tm.*,
							 p1.user_id as player1_user_id, p1.alias as player1_alias,
							 p2.user_id as player2_user_id, p2.alias as player2_alias
				FROM tournament_matches tm
				LEFT JOIN tournament_participants p1 ON tm.player1_id = p1.id
				LEFT JOIN tournament_participants p2 ON tm.player2_id = p2.id
				WHERE tm.tournament_id = ? AND tm.id = ?
			`).get(tournamentId, matchId);

			if (!match) {
				return reply.code(404).send({ error: 'Match not found' });
			}

			// Verify that the current user is one of the players in this match
			if (match.player1_user_id !== uid && match.player2_user_id !== uid) {
				return reply.code(403).send({ error: 'You are not a participant in this match' });
			}

			// Determine who the opponent is
			const opponentUserId = match.player1_user_id === uid ? match.player2_user_id : match.player1_user_id;
			const opponentAlias = match.player1_user_id === uid ? match.player2_alias : match.player1_alias;

			// Verify opponent credentials
			const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
			console.log('User found by email:', user ? `ID: ${user.id}, email: ${user.email}` : 'NOT FOUND');
			console.log('User password hash exists:', user ? (user.password_hash ? 'YES' : 'NO/NULL') : 'N/A');
			console.log('User password hash length:', user && user.password_hash ? user.password_hash.length : 0);
			
			if (!user) {
				return reply.code(401).send({ error: 'Invalid credentials' });
			}

			// Verify that the authenticated user is the expected opponent
			if (user.id !== opponentUserId) {
				return reply.code(403).send({ error: 'You are not the expected opponent for this match' });
			}

			// Verify password
			const bcrypt = require('bcrypt');
			const validPassword = await bcrypt.compare(password, user.password_hash);
			
			if (!validPassword) {
				return reply.code(401).send({ error: 'Invalid credentials' });
			}
			
			return {
				success: true,
				opponentId: user.id,
				opponentName: user.display_name,
				opponentAlias: opponentAlias,
				message: 'Opponent authenticated successfully'
			};
		} catch (error) {
			console.error('Error verifying opponent:', error);
			return reply.code(500).send({ error: 'Error verifying opponent authentication' });
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
				SELECT tm.*, t.status, t.current_round,
					   p1.user_id as player1_user_id, p2.user_id as player2_user_id
				FROM tournament_matches tm
				JOIN tournaments t ON tm.tournament_id = t.id
				LEFT JOIN tournament_participants p1 ON tm.player1_id = p1.id
				LEFT JOIN tournament_participants p2 ON tm.player2_id = p2.id
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

			if (winnerId !== match.player1_user_id && winnerId !== match.player2_user_id) {
				return reply.code(400).send({ error: 'Winner must be one of the match players' });
			}

			// Convert winnerId (user ID) to participant ID for database storage
			const winnerParticipantId = winnerId === match.player1_user_id ? match.player1_id : match.player2_id;

			db.prepare(`
				UPDATE tournament_matches
				SET winner_id = ?, score_player1 = ?, score_player2 = ?, played_at = datetime('now')
				WHERE id = ?
			`).run(winnerParticipantId, scorePlayer1, scorePlayer2, matchId);

			await autoAdvanceRoundIfComplete(app, db, tournamentId, match.current_round);

			reply.send({ message: 'Match result updated successfully' });
		} catch (error) {
			console.error('Error updating match result: ', error);
			reply.code(500).send({ error: 'Error updating match result' });
		}
	});

	// MODIFICADO: Añadida lógica de notificación
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
				let winnerUserId = null;
				let winnerAlias = "N/A";
				
				if (winners.length === 1) {
					// Convertir participant_id a user_id y obtener alias
					const winnerParticipant = db.prepare(`
						SELECT user_id, alias FROM tournament_participants WHERE id = ?
					`).get(winners[0].winner_id);
					
					if (winnerParticipant) {
						winnerUserId = winnerParticipant.user_id;
						winnerAlias = winnerParticipant.alias;
					}
				}

				db.prepare(`
					UPDATE tournaments
					SET status = 'finished', winner_id = ?, completed_at = datetime('now')
					WHERE id = ?
				`).run(winnerUserId, tournamentId);

				console.log(`Tournament ${tournamentId} finished with winner user_id: ${winnerUserId}`);

				// === NOTIFICACIÓN DE FIN DE TORNEO ===
				const tournament = db.prepare('SELECT name FROM tournaments WHERE id = ?').get(tournamentId);
				const message = `🏆 ¡El torneo "${tournament.name}" ha finalizado! El ganador es ${winnerAlias}.`;
				const participants = db.prepare(`
					SELECT user_id FROM tournament_participants WHERE tournament_id = ?
				`).all(tournamentId);

				for (const participant of participants) {
					// Usar app.inject para llamar a la API de chat
					await app.inject({
					  method: 'POST',
					  url: '/api/chat/notify',
					  payload: { to: participant.user_id, body: message }
					});

					// El websocketPush original sigue siendo bueno para notificaciones de UI (no-chat)
					if (app.websocketPush) {
						app.websocketPush(participant.user_id, {
							type: 'tournament_finished',
							tournamentId,
							winnerId: winnerUserId
						});
					}
				}
				// ======================================

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

			// === NOTIFICACIÓN DE AVANCE DE RONDA ===
			const tournament = db.prepare('SELECT name FROM tournaments WHERE id = ?').get(tournamentId);
			// ======================================

			for (const match of nextMatches) {
				insertMatch.run(tournamentId, match.round, match.position, match.player1_id, match.player2_id);

				// === NOTIFICACIÓN DE PRÓXIMO PARTIDO ===
				try {
					const p1 = db.prepare('SELECT user_id, alias FROM tournament_participants WHERE id = ?').get(match.player1_id);
					const p2 = db.prepare('SELECT user_id, alias FROM tournament_participants WHERE id = ?').get(match.player2_id);

					if (p1 && p2) {
						const msg1 = `🏆 ¡Siguiente ronda! Juegas contra ${p2.alias} en el torneo "${tournament.name}" (Ronda ${nextRound}).`;
						await app.inject({
						  method: 'POST',
						  url: '/api/chat/notify',
						  payload: { to: p1.user_id, body: msg1 }
						});
						
						const msg2 = `🏆 ¡Siguiente ronda! Juegas contra ${p1.alias} en el torneo "${tournament.name}" (Ronda ${nextRound}).`;
						await app.inject({
						  method: 'POST',
						  url: '/api/chat/notify',
						  payload: { to: p2.user_id, body: msg2 }
						});
					}
				} catch (e) {
					console.error('Error sending round notification:', e);
				}
				// =======================================
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
}

// ELIMINADO: Código de setupTournamentNotifications y helpers relacionados
// module.exports.setupTournamentNotifications = setupTournamentNotifications; // <- ELIMINADO

module.exports = tournamentsRoutes;

// MODIFICADO: Helper mejorado para incluir el nombre del torneo
async function notifyParticipants(app, tournamentId, messageTemplate) {
  const participants = app.db.prepare(`
    SELECT user_id FROM tournament_participants WHERE tournament_id = ?
  `).all(tournamentId);
  
  // AÑADIDO: Obtener el nombre del torneo
  const tournament = app.db.prepare('SELECT name FROM tournaments WHERE id = ?').get(tournamentId);
  const tournamentName = tournament ? tournament.name : `ID ${tournamentId}`;

  // MODIFICADO: Reemplazar el nuevo placeholder
  const message = messageTemplate
	.replace("{tournamentName}", tournamentName)
	.replace("{tournamentId}", tournamentId); // Mantener por retrocompatibilidad

  for (const participant of participants) {
    await app.inject({
      method: 'POST',
      url: '/api/chat/notify',
      payload: { to: participant.user_id, body: message }
    });
  }
}