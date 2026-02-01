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
        // Add scout attribution
        const scoutTeam = localStorage.getItem('scoutTeam') || 'Unknown';

        this.matches.push({
            ...matchData,
            scoutTeam: scoutTeam,
            timestamp: new Date().toISOString()
        });
        this.saveData();
    }

    exportData() {
        const dataStr = JSON.stringify(this.matches, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `frc_scouting_data_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedMatches = JSON.parse(e.target.result);
                    if (!Array.isArray(importedMatches)) {
                        reject('Invalid data format: Expected an array of matches');
                        return;
                    }

                    // Simple merge: add unique matches based on timestamp + match + team
                    let added = 0;
                    importedMatches.forEach(newMatch => {
                        const exists = this.matches.some(m =>
                            m.matchNumber === newMatch.matchNumber &&
                            m.teamNumber === newMatch.teamNumber &&
                            m.scoutTeam === newMatch.scoutTeam
                        );

                        if (!exists) {
                            this.matches.push(newMatch);
                            added++;
                        }
                    });

                    this.saveData();
                    resolve(added);
                } catch (err) {
                    reject('Error parsing JSON file');
                }
            };
            reader.readAsText(file);
        });
    }

    clearData() {
        if (confirm('Are you sure you want to delete ALL scouting data? This cannot be undone.')) {
            this.matches = [];
            this.saveData();
            location.reload();
        }
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
            hoodAdjustable: {},
            chassisTypes: {}
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
            if (match.shooterMechanism) {
                if (!stats.shooterMechanisms[match.shooterMechanism]) {
                    stats.shooterMechanisms[match.shooterMechanism] = 0;
                }
                stats.shooterMechanisms[match.shooterMechanism]++;
            }

            // Track hood adjustable
            if (match.hoodAdjustable) {
                if (!stats.hoodAdjustable[match.hoodAdjustable]) {
                    stats.hoodAdjustable[match.hoodAdjustable] = 0;
                }
                stats.hoodAdjustable[match.hoodAdjustable]++;
            }

            // Track chassis type
            if (match.chassisType) {
                if (!stats.chassisTypes[match.chassisType]) {
                    stats.chassisTypes[match.chassisType] = 0;
                }
                stats.chassisTypes[match.chassisType]++;
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

        // Helper to find most common item
        const getMostCommon = (obj) => {
            if (Object.keys(obj).length === 0) return 'N/A';
            return Object.keys(obj).reduce((a, b) => obj[a] > obj[b] ? a : b);
        };

        stats.primaryShooter = getMostCommon(stats.shooterMechanisms);
        stats.primaryHoodAdjustable = getMostCommon(stats.hoodAdjustable);
        stats.primaryChassis = getMostCommon(stats.chassisTypes);

        return stats;
    }
}

// ===== INITIALIZE =====
const scoutingData = new ScoutingData();

// ===== LOGIN MANAGEMENT =====
function checkLogin() {
    const userTeam = localStorage.getItem('frc-scout-team');
    if (!userTeam) {
        document.getElementById('login-modal').classList.add('active');
    } else {
        console.log(`Logged in as Team ${userTeam}`);
    }
}

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const teamNum = document.getElementById('scout-team-number').value;
    if (teamNum) {
        localStorage.setItem('frc-scout-team', teamNum);
        document.getElementById('login-modal').classList.remove('active');
        // Reload analytics if on that page
        if (document.getElementById('analytics-view').classList.contains('active')) {
            loadAnalyticsView();
        }
    }
});

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
        chassisType: document.getElementById('chassis-type').value,
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
                        <div class="stat-label">Chassis</div>
                        <div class="stat-value" style="font-size: 1rem;">${stats.primaryChassis}</div>
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
            <span class="metric-name">Chassis Type</span>
            <span class="metric-value">${stats.primaryChassis}</span>
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
                <div>${match.chassisType} Chassis, Cap ${match.fuelCapacity}, Shooter: ${match.shooterMechanism}</div>
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
    // 1. Load Event Stats (Open Data)
    loadEventStats();

    // 2. Load My Team Analytics
    const userTeam = localStorage.getItem('frc-scout-team');
    if (userTeam) {
        loadMyTeamAnalytics(parseInt(userTeam));
    } else {
        document.getElementById('my-team-container').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔒</div>
                <div class="empty-state-text">Team Not Set</div>
                <p>Please log in with your team number to see custom analytics.</p>
                <button class="btn btn-secondary mt-3" onclick="document.getElementById('login-modal').classList.add('active')">Set Team Number</button>
            </div>
        `;
    }
}

// Analytics Tabs Logic
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.analytics-tab-content').forEach(c => c.classList.remove('active')); // Fixed class name reference
        document.getElementById(`analytics-${btn.dataset.tab}`).classList.add('active'); // Wait, need to fix ID reference
        // Wait, the tab logic in HTML was:
        // tab-btn data-tab="my-team" -> id="analytics-my-team"
        // tab-btn data-tab="event-stats" -> id="analytics-event-stats"

        // Correct implementation:
        btn.classList.add('active');
        document.querySelectorAll('.analytics-tab-content').forEach(c => c.classList.add('hidden'));
        document.querySelectorAll('.analytics-tab-content').forEach(c => c.classList.remove('active'));

        const targetId = `analytics-${btn.dataset.tab}`;
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
            targetEl.classList.remove('hidden');
            targetEl.classList.add('active');
        }
    });
});
// Re-implementing cleaner tab logic since above attempt was messy in thought process
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.analytics-tab-content').forEach(c => {
            c.classList.remove('active');
            c.classList.add('hidden');
        });

        btn.classList.add('active');
        const contentId = `analytics-${btn.dataset.tab}`;
        const content = document.getElementById(contentId);
        content.classList.remove('hidden');
        content.classList.add('active');
    });
});


function loadEventStats() {
    const container = document.getElementById('analytics-container');
    const teams = scoutingData.getAllTeams();
    const teamNumbers = Object.keys(teams);

    if (teamNumbers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📈</div>
                <div class="empty-state-text">No data available</div>
                <p>Scout some matches to see event statistics!</p>
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

function loadMyTeamAnalytics(teamNumber) {
    const container = document.getElementById('my-team-container');
    const stats = scoutingData.getTeamStats(teamNumber);

    // Get overall scouting stats
    const totalMatches = scoutingData.matches.length;

    // Build the Scouting Activity section
    let html = `
        <div class="card mb-3">
            <h2>Scouting Contributions</h2>
            <div class="analytics-grid">
                <div class="analytics-card">
                    <h3>Your Activity</h3>
                    <div class="metric">
                        <span class="metric-name">Total Matches Scouted</span>
                        <span class="metric-value">${totalMatches}</span>
                    </div>
                </div>
            </div>

            <div class="mt-3">
                <h3>Scouting History</h3>
                <div class="match-list">
                    ${scoutingData.matches.slice().reverse().map(match => `
                        <div class="match-item">
                            <div class="match-header">
                                <span class="match-number">Match ${match.matchNumber}</span>
                                <span style="color: ${match.alliance === 'Red' ? '#ef4444' : '#3b82f6'}">
                                    Team ${match.teamNumber} (${match.alliance} - ${match.position})
                                </span>
                            </div>
                            <div class="match-details">
                                <div>Auto: ${match.autoFuelScored} fuel, Climb ${match.autoTowerClimb}</div>
                                <div>Teleop: ${match.teleopFuelScored} fuel</div>
                                <div>Endgame: Climb ${match.climb}</div>
                                <div>Defense: ${match.defense}/5</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    if (!stats) {
        html += `
            <div class="empty-state">
                <div class="empty-state-icon">❓</div>
                <div class="empty-state-text">No Performance Data for Team ${teamNumber}</div>
                <p>We haven't scouted any matches for your team yet.</p>
            </div>
        `;
    } else {
        html += `
            <div class="card mb-3">
                <h2>Your Team: ${teamNumber} Performance</h2>
                <div class="analytics-grid">
                    <div class="analytics-card">
                        <h3>Summary</h3>
                        <div class="metric">
                            <span class="metric-name">Matches Played</span>
                            <span class="metric-value">${stats.matchCount}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-name">Avg Points</span>
                            <span class="metric-value">${stats.avgPoints}</span>
                        </div>
                    </div>
                    <div class="analytics-card">
                        <h3>Strengths</h3>
                        <div class="metric">
                            <span class="metric-name">Avg Teleop Fuel</span>
                            <span class="metric-value">${stats.avgTeleopFuel}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-name">Endgame Climb</span>
                            <span class="metric-value">${stats.avgEndgameClimb}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-name">Chassis</span>
                            <span class="metric-value">${stats.primaryChassis}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
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
checkLogin();
