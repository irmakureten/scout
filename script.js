// ===== DATA MANAGEMENT =====
class ScoutingData {
    constructor() {
        this.matches = this.loadData();
    }

    loadData() {
        const data = localStorage.getItem('frc-scouting-data-2026');
        return data ? JSON.parse(data) : [];
    }

    saveData() {
        localStorage.setItem('frc-scouting-data-2026', JSON.stringify(this.matches));
    }

    addMatch(matchData) {
        this.matches.push({
            ...matchData,
            timestamp: new Date().toISOString()
        });
        this.saveData();
    }

    getTeamMatches(teamNumber) {
        return this.matches.filter(match => match.teamNumber === teamNumber);
    }

    getAllTeams() {
        const teams = {};
        this.matches.forEach(match => {
            if (!teams[match.teamNumber]) {
                teams[match.teamNumber] = [];
            }
            teams[match.teamNumber].push(match);
        });
        return teams;
    }

    getTeamStats(teamNumber) {
        const matches = this.getTeamMatches(teamNumber);
        if (matches.length === 0) return null;

        const stats = {
            matchCount: matches.length,
            avgAutoFuel: 0,
            avgAutoCycleTime: 0,
            avgTeleopFuel: 0,
            avgTeleopCycleTime: 0,
            avgTeleopFuelRate: 0,
            avgFuelCapacity: 0,
            avgAutoClimb: 0,
            avgEndgameClimb: 0,
            avgDefense: 0,
            totalPoints: 0,
            shooterMechanisms: {},
            hoodAdjustable: {}
        };

        matches.forEach(match => {
            stats.avgAutoFuel += match.autoFuelScored;
            stats.avgAutoCycleTime += (parseFloat(match.autoCycleTime) || 0);
            stats.avgTeleopFuel += match.teleopFuelScored;
            stats.avgTeleopCycleTime += (parseFloat(match.teleopCycleTime) || 0);
            stats.avgTeleopFuelRate += (parseFloat(match.teleopFuelRate) || 0);
            stats.avgFuelCapacity += match.fuelCapacity;
            stats.avgAutoClimb += parseInt(match.autoTowerClimb);
            stats.avgEndgameClimb += parseInt(match.climb);
            stats.avgDefense += parseInt(match.defense);

            // Track shooter mechanisms
            if (!stats.shooterMechanisms[match.shooterMechanism]) {
                stats.shooterMechanisms[match.shooterMechanism] = 0;
            }
            stats.shooterMechanisms[match.shooterMechanism]++;

            // Track hood adjustable
            if (match.hoodAdjustable) {
                if (!stats.hoodAdjustable[match.hoodAdjustable]) {
                    stats.hoodAdjustable[match.hoodAdjustable] = 0;
                }
                stats.hoodAdjustable[match.hoodAdjustable]++;
            }

            // Calculate approximate points (2026 scoring)
            const points =
                (match.autoFuelScored * 1) + // Auto fuel worth 1 point each
                (parseInt(match.autoTowerClimb) * 3) + // Auto climb bonus
                (match.teleopFuelScored * 1) + // Teleop fuel
                (parseInt(match.climb) * 5); // Endgame climb
            stats.totalPoints += points;
        });

        const count = matches.length;
        stats.avgAutoFuel = (stats.avgAutoFuel / count).toFixed(1);
        stats.avgAutoCycleTime = (stats.avgAutoCycleTime / count).toFixed(1);
        stats.avgTeleopFuel = (stats.avgTeleopFuel / count).toFixed(1);
        stats.avgTeleopCycleTime = (stats.avgTeleopCycleTime / count).toFixed(1);
        stats.avgTeleopFuelRate = (stats.avgTeleopFuelRate / count).toFixed(2);
        stats.avgFuelCapacity = (stats.avgFuelCapacity / count).toFixed(1);
        stats.avgAutoClimb = (stats.avgAutoClimb / count).toFixed(1);
        stats.avgEndgameClimb = (stats.avgEndgameClimb / count).toFixed(1);
        stats.avgDefense = (stats.avgDefense / count).toFixed(1);
        stats.avgPoints = (stats.totalPoints / count).toFixed(1);

        // Find most common shooter mechanism
        stats.primaryShooter = Object.keys(stats.shooterMechanisms).reduce((a, b) =>
            stats.shooterMechanisms[a] > stats.shooterMechanisms[b] ? a : b
        );

        // Find most common hood adjustable setting
        if (Object.keys(stats.hoodAdjustable).length > 0) {
            stats.primaryHoodAdjustable = Object.keys(stats.hoodAdjustable).reduce((a, b) =>
                stats.hoodAdjustable[a] > stats.hoodAdjustable[b] ? a : b
            );
        } else {
            stats.primaryHoodAdjustable = 'N/A';
        }

        return stats;
    }
}

// ===== INITIALIZE =====
const scoutingData = new ScoutingData();

// ===== VIEW MANAGEMENT =====
function switchView(viewName) {
    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === viewName) {
            btn.classList.add('active');
        }
    });

    // Update views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`${viewName}-view`).classList.add('active');

    // Load view-specific content
    if (viewName === 'teams') {
        loadTeamsView();
    } else if (viewName === 'analytics') {
        loadAnalyticsView();
    }
}

// Navigation event listeners
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        switchView(btn.dataset.view);
    });
});

// ===== FIELD SELECTION =====
document.querySelectorAll('.position-marker').forEach(marker => {
    marker.addEventListener('click', () => {
        const alliance = marker.dataset.alliance;
        const position = marker.dataset.position;

        // Show form, hide field
        document.getElementById('field-selection').classList.add('hidden');
        document.getElementById('scouting-form-container').classList.remove('hidden');

        // Set alliance and position
        document.getElementById('alliance').value = alliance;
        document.getElementById('position').value = position;
        document.getElementById('alliance-display').value = `${alliance} Alliance - Position ${position}`;

        // Focus on team number
        document.getElementById('team-number').focus();
    });
});

// Back to field button
document.getElementById('back-to-field').addEventListener('click', () => {
    document.getElementById('field-selection').classList.remove('hidden');
    document.getElementById('scouting-form-container').classList.add('hidden');
    document.getElementById('scout-form').reset();
});

// ===== SCOUT FORM =====
document.getElementById('scout-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const matchData = {
        teamNumber: parseInt(document.getElementById('team-number').value),
        matchNumber: document.getElementById('match-number').value,
        alliance: document.getElementById('alliance').value,
        position: document.getElementById('position').value,
        autoFuelScored: parseInt(document.getElementById('auto-fuel-scored').value),
        autoCycleTime: parseFloat(document.getElementById('auto-cycle-time').value),
        autoTowerClimb: document.getElementById('auto-tower-climb').value,
        teleopFuelScored: parseInt(document.getElementById('teleop-fuel-scored').value),
        teleopCycleTime: parseFloat(document.getElementById('teleop-cycle-time').value),
        teleopFuelRate: parseFloat(document.getElementById('teleop-fuel-rate').value),
        fuelCapacity: parseInt(document.getElementById('fuel-capacity').value),
        shooterMechanism: document.getElementById('shooter-mechanism').value,
        hoodAdjustable: document.getElementById('hood-adjustable').value,
        climb: document.getElementById('climb').value,
        defense: document.getElementById('defense').value,
        notes: document.getElementById('notes').value
    };

    scoutingData.addMatch(matchData);

    // Show success feedback
    alert(`Match data saved for Team ${matchData.teamNumber}!`);

    // Reset form and go back to field
    document.getElementById('scout-form').reset();
    document.getElementById('field-selection').classList.remove('hidden');
    document.getElementById('scouting-form-container').classList.add('hidden');
});

// ===== TEAMS VIEW =====
function loadTeamsView() {
    const container = document.getElementById('teams-container');
    const teams = scoutingData.getAllTeams();
    const teamNumbers = Object.keys(teams).sort((a, b) => parseInt(a) - parseInt(b));

    if (teamNumbers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <div class="empty-state-text">No teams scouted yet</div>
                <p>Start scouting matches to see team data here!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = teamNumbers.map(teamNumber => {
        const stats = scoutingData.getTeamStats(parseInt(teamNumber));
        return `
            <div class="team-card" data-team="${teamNumber}">
                <div class="team-number">Team ${teamNumber}</div>
                <div class="team-stats">
                    <div class="stat">
                        <div class="stat-label">Matches</div>
                        <div class="stat-value">${stats.matchCount}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Avg Points</div>
                        <div class="stat-value">${stats.avgPoints}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Auto Fuel</div>
                        <div class="stat-value">${stats.avgAutoFuel}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Teleop Fuel</div>
                        <div class="stat-value">${stats.avgTeleopFuel}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Avg Climb</div>
                        <div class="stat-value">${stats.avgEndgameClimb}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Shooter</div>
                        <div class="stat-value">${stats.primaryShooter}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers
    document.querySelectorAll('.team-card').forEach(card => {
        card.addEventListener('click', () => {
            showTeamDetail(parseInt(card.dataset.team));
        });
    });
}

function showTeamDetail(teamNumber) {
    const stats = scoutingData.getTeamStats(teamNumber);
    const matches = scoutingData.getTeamMatches(teamNumber);

    document.getElementById('teams-container').classList.add('hidden');
    document.getElementById('team-detail').classList.remove('hidden');
    document.getElementById('detail-team-number').textContent = `Team ${teamNumber}`;

    // Averages
    document.getElementById('detail-averages').innerHTML = `
        <div class="metric">
            <span class="metric-name">Auto Fuel</span>
            <span class="metric-value">${stats.avgAutoFuel}</span>
        </div>
        <div class="metric">
            <span class="metric-name">Auto Cycle</span>
            <span class="metric-value">${stats.avgAutoCycleTime}s</span>
        </div>
        <div class="metric">
            <span class="metric-name">Teleop Fuel</span>
            <span class="metric-value">${stats.avgTeleopFuel}</span>
        </div>
        <div class="metric">
            <span class="metric-name">Teleop Cycle</span>
            <span class="metric-value">${stats.avgTeleopCycleTime}s</span>
        </div>
        <div class="metric">
            <span class="metric-name">Fuel/Sec</span>
            <span class="metric-value">${stats.avgTeleopFuelRate}</span>
        </div>
        <div class="metric">
            <span class="metric-name">Fuel Capacity</span>
            <span class="metric-value">${stats.avgFuelCapacity}</span>
        </div>
        <div class="metric">
            <span class="metric-name">Auto Climb</span>
            <span class="metric-value">${stats.avgAutoClimb}</span>
        </div>
        <div class="metric">
            <span class="metric-name">Endgame Climb</span>
            <span class="metric-value">${stats.avgEndgameClimb}</span>
        </div>
    `;

    // Summary
    document.getElementById('detail-summary').innerHTML = `
        <div class="metric">
            <span class="metric-name">Total Matches</span>
            <span class="metric-value">${stats.matchCount}</span>
        </div>
        <div class="metric">
            <span class="metric-name">Avg Points</span>
            <span class="metric-value">${stats.avgPoints}</span>
        </div>
        <div class="metric">
            <span class="metric-name">Primary Shooter</span>
            <span class="metric-value">${stats.primaryShooter}</span>
        </div>
        <div class="metric">
            <span class="metric-name">Hood Adjustable</span>
            <span class="metric-value">${stats.primaryHoodAdjustable}</span>
        </div>
        <div class="metric">
            <span class="metric-name">Defense Rating</span>
            <span class="metric-value">${stats.avgDefense}/5</span>
        </div>
    `;

    // Match history
    document.getElementById('detail-matches').innerHTML = matches.map(match => `
        <div class="match-item">
            <div class="match-header">
                <span class="match-number">Match ${match.matchNumber}</span>
                <span style="color: ${match.alliance === 'Red' ? '#ef4444' : '#3b82f6'}">${match.alliance} Alliance - Pos ${match.position}</span>
            </div>
            <div class="match-details">
                <div>Auto: ${match.autoFuelScored} fuel (${match.autoCycleTime || 0}s), Climb ${match.autoTowerClimb}</div>
                <div>Teleop: ${match.teleopFuelScored} fuel (${match.teleopCycleTime || 0}s, ${match.teleopFuelRate || 0}/s)</div>
                <div>Cap ${match.fuelCapacity}, Shooter: ${match.shooterMechanism}, Hood: ${match.hoodAdjustable || 'N/A'}</div>
                <div>Endgame Climb: ${match.climb}</div>
                <div>Defense: ${match.defense}/5</div>
            </div>
            ${match.notes ? `<div style="margin-top: 8px; color: var(--text-muted); font-size: 0.9rem;">${match.notes}</div>` : ''}
        </div>
    `).join('');
}

document.getElementById('back-to-teams').addEventListener('click', () => {
    document.getElementById('teams-container').classList.remove('hidden');
    document.getElementById('team-detail').classList.add('hidden');
});

// ===== ANALYTICS VIEW =====
function loadAnalyticsView() {
    const container = document.getElementById('analytics-container');
    const teams = scoutingData.getAllTeams();
    const teamNumbers = Object.keys(teams);

    if (teamNumbers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📈</div>
                <div class="empty-state-text">No analytics available</div>
                <p>Scout some matches to see analytics!</p>
            </div>
        `;
        return;
    }

    // Calculate rankings
    const teamStats = teamNumbers.map(teamNumber => ({
        teamNumber: parseInt(teamNumber),
        ...scoutingData.getTeamStats(parseInt(teamNumber))
    }));

    // Sort by average points
    const topScorers = [...teamStats].sort((a, b) => parseFloat(b.avgPoints) - parseFloat(a.avgPoints)).slice(0, 10);

    // Sort by fuel scored
    const topFuel = [...teamStats].sort((a, b) => parseFloat(b.avgTeleopFuel) - parseFloat(a.avgTeleopFuel)).slice(0, 10);

    // Sort by climb
    const topClimbers = [...teamStats].sort((a, b) => parseFloat(b.avgEndgameClimb) - parseFloat(a.avgEndgameClimb)).slice(0, 10);

    // Sort by defense
    const topDefense = [...teamStats].sort((a, b) => parseFloat(b.avgDefense) - parseFloat(a.avgDefense)).slice(0, 10);

    container.innerHTML = `
        <div class="analytics-grid">
            <div class="analytics-card">
                <h3>🏆 Top Scorers</h3>
                ${topScorers.map((team, index) => `
                    <div class="metric">
                        <span class="metric-name">#${index + 1} Team ${team.teamNumber}</span>
                        <span class="metric-value">${team.avgPoints}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="analytics-card">
                <h3>⛽ Best Fuel Scorers</h3>
                ${topFuel.map((team, index) => `
                    <div class="metric">
                        <span class="metric-name">#${index + 1} Team ${team.teamNumber}</span>
                        <span class="metric-value">${team.avgTeleopFuel}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="analytics-card">
                <h3>🧗 Best Climbers</h3>
                ${topClimbers.map((team, index) => `
                    <div class="metric">
                        <span class="metric-name">#${index + 1} Team ${team.teamNumber}</span>
                        <span class="metric-value">Level ${team.avgEndgameClimb}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="analytics-card">
                <h3>🛡️ Best Defense</h3>
                ${topDefense.map((team, index) => `
                    <div class="metric">
                        <span class="metric-name">#${index + 1} Team ${team.teamNumber}</span>
                        <span class="metric-value">${team.avgDefense}/5</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="analytics-card">
                <h3>📊 Overall Stats</h3>
                <div class="metric">
                    <span class="metric-name">Total Teams Scouted</span>
                    <span class="metric-value">${teamNumbers.length}</span>
                </div>
                <div class="metric">
                    <span class="metric-name">Total Matches</span>
                    <span class="metric-value">${scoutingData.matches.length}</span>
                </div>
                <div class="metric">
                    <span class="metric-name">Avg Matches/Team</span>
                    <span class="metric-value">${(scoutingData.matches.length / teamNumbers.length).toFixed(1)}</span>
                </div>
            </div>
        </div>
    `;
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
    // Alt+1/2/3 to switch views
    if (e.altKey) {
        if (e.key === '1') switchView('scout');
        if (e.key === '2') switchView('teams');
        if (e.key === '3') switchView('analytics');
    }
});

// ===== INITIALIZE ON LOAD =====
console.log('FRC 2026 REBUILT Scouting System Loaded');
console.log(`${scoutingData.matches.length} matches in database`);
