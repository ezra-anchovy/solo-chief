/**
 * Solo Chief Dashboard - Strategic Triage Engine
 * Implements the 5-tier classification system with ROI scoring
 */

// ============================================================================
// DATA MODELS
// ============================================================================

class Task {
    constructor(id, title, estimatedMinutes, importance, urgency, deadline = null, tags = [], notes = '') {
        this.id = id;
        this.title = title;
        this.estimatedMinutes = estimatedMinutes || 30;
        this.importance = importance || 3; // 1-5
        this.urgency = urgency || 3; // 1-5
        this.deadline = deadline;
        this.tags = tags;
        this.notes = notes;
        this.createdAt = new Date();
        this.rolloverCount = 0;
        this.completed = false;
        this.classification = null; // Set by triage
        this.roiScore = 0; // Set by triage
    }
}

class UserContext {
    constructor() {
        this.goals = [
            { description: 'Ship Solo Chief MVP', progress: 65 },
            { description: 'Reach $10k MRR', progress: 30 }
        ];
        this.energyLevel = 4; // 1-5
        this.availableMinutes = 480; // 8 hours
        this.completedToday = 0;
        this.focusTimeMinutes = 0;
        this.dayStreak = 7;
        this.distractionsBlocked = 0;
    }
}

// ============================================================================
// STRATEGIC TRIAGE ENGINE - 5-TIER SYSTEM
// ============================================================================

class StrategicTriageEngine {
    constructor() {
        this.TIER_WEIGHTS = {
            GOAL_ALIGNMENT: 0.30,
            IMPACT_MAGNITUDE: 0.25,
            TIME_EFFICIENCY: 0.20,
            DEADLINE_PROXIMITY: 0.15,
            ENERGY_FIT: 0.10
        };
    }

    /**
     * Main entry point for task triage
     * Returns classification and ROI score for each task
     */
    triageTasks(tasks, userContext) {
        const results = [];

        for (const task of tasks) {
            if (task.completed) continue;

            // Step 1: Apply heuristic rules first (auto-classify obvious cases)
            const autoClassification = this.applyHeuristicRules(task, userContext);
            if (autoClassification) {
                task.classification = autoClassification.tier;
                task.roiScore = autoClassification.roiScore;
                task.reason = autoClassification.reason;
                results.push(task);
                continue;
            }

            // Step 2: Calculate ROI score for remaining tasks
            task.roiScore = this.calculateROIScore(task, userContext);

            // Step 3: Apply strategic adjustments
            task.roiScore = this.applyStrategicAdjustments(task, userContext);

            // Step 4: Determine final classification
            task.classification = this.classifyTask(task, userContext);

            results.push(task);
        }

        // Step 5: Sort by ROI score
        return results.sort((a, b) => b.roiScore - a.roiScore);
    }

    /**
     * Step 1: Heuristic Rules Engine
     * Auto-classify tasks matching obvious patterns
     */
    applyHeuristicRules(task, userContext) {
        // T1 CRITICAL - Automatic triggers
        if (this.isCriticalTask(task, userContext)) {
            return {
                tier: 'T1',
                roiScore: 90,
                reason: 'CRITICAL: Urgent deadline or emergency detected'
            };
        }

        // T4 DISTRACTION - Automatic triggers
        if (this.isDistractionTask(task, userContext)) {
            return {
                tier: 'T4',
                roiScore: 15,
                reason: 'DISTRACTION: Low importance, no clear value'
            };
        }

        // T5 PHANTOM - Automatic triggers
        if (this.isPhantomTask(task, userContext)) {
            return {
                tier: 'T5',
                roiScore: 10,
                reason: 'PHANTOM: Too vague - needs clarification or deletion'
            };
        }

        return null; // Needs full ROI calculation
    }

    /**
     * Check if task should be T1 CRITICAL
     */
    isCriticalTask(task, userContext) {
        // Deadline < 24 hours AND importance >= 4
        if (task.deadline) {
            const deadline = new Date(task.deadline);
            const hoursUntil = (deadline - new Date()) / (1000 * 60 * 60);
            if (hoursUntil <= 24 && hoursUntil >= 0 && task.importance >= 4) {
                return true;
            }
        }

        // Title contains urgency keywords
        const urgencyKeywords = ['asap', 'emergency', 'urgent', 'broken', 'down', 'critical'];
        const lowerTitle = task.title.toLowerCase();
        if (urgencyKeywords.some(kw => lowerTitle.includes(kw))) {
            return true;
        }

        // Revenue at risk (detected via tags)
        if (task.tags.some(tag => ['client', 'revenue', 'money', 'critical'].includes(tag.toLowerCase()))) {
            return true;
        }

        return false;
    }

    /**
     * Check if task should be T4 DISTRACTION
     */
    isDistractionTask(task, userContext) {
        // Low importance and low urgency
        if (task.importance <= 2 && task.urgency <= 2) {
            return true;
        }

        // Title contains distraction keywords
        const distractionKeywords = ['scroll', 'check social', 'browse', 'news', 'entertainment'];
        const lowerTitle = task.title.toLowerCase();
        if (distractionKeywords.some(kw => lowerTitle.includes(kw))) {
            return true;
        }

        // Long time estimate with low importance
        if (task.estimatedMinutes > 240 && task.importance <= 3) {
            return true;
        }

        // Chronic rollover (>5 times)
        if (task.rolloverCount >= 5) {
            return true;
        }

        return false;
    }

    /**
     * Check if task should be T5 PHANTOM
     */
    isPhantomTask(task, userContext) {
        // No verb detected (no clear action)
        const actionVerbs = ['write', 'create', 'build', 'fix', 'update', 'send', 'review', 'analyze', 'design', 'implement', 'call', 'meet'];
        const lowerTitle = task.title.toLowerCase();
        if (!actionVerbs.some(verb => lowerTitle.includes(verb))) {
            return true;
        }

        // Vague/overcomplicated title (>15 words)
        const wordCount = task.title.split(/\s+/).length;
        if (wordCount > 15) {
            return true;
        }

        // Chronic rollover with no progress
        if (task.rolloverCount >= 3 && !task.notes) {
            return true;
        }

        return false;
    }

    /**
     * Step 2: Calculate ROI Score
     * ROI = (GOAL_ALIGNMENT × 0.30) + (IMPACT × 0.25) + 
     *       (TIME_EFFICIENCY × 0.20) + (DEADLINE × 0.15) + (ENERGY × 0.10)
     */
    calculateROIScore(task, userContext) {
        const goalAlignment = this.calculateGoalAlignment(task, userContext);
        const impact = this.calculateImpactMagnitude(task, userContext);
        const timeEfficiency = this.calculateTimeEfficiency(task, userContext);
        const deadlineProximity = this.calculateDeadlineProximity(task, userContext);
        const energyFit = this.calculateEnergyFit(task, userContext);

        const roi = (
            (goalAlignment * this.TIER_WEIGHTS.GOAL_ALIGNMENT) +
            (impact * this.TIER_WEIGHTS.IMPACT_MAGNITUDE) +
            (timeEfficiency * this.TIER_WEIGHTS.TIME_EFFICIENCY) +
            (deadlineProximity * this.TIER_WEIGHTS.DEADLINE_PROXIMITY) +
            (energyFit * this.TIER_WEIGHTS.ENERGY_FIT)
        );

        return Math.round(Math.max(0, Math.min(100, roi)));
    }

    /**
     * GOAL_ALIGNMENT: How directly does this advance quarterly goals?
     * 90+ = Direct line to goal progress
     * 50-70 = Tangentially related
     * <50 = No clear connection
     */
    calculateGoalAlignment(task, userContext) {
        const lowerTitle = task.title.toLowerCase();
        const lowerTags = task.tags.map(t => t.toLowerCase()).join(' ');

        // Direct goal matches
        for (const goal of userContext.goals) {
            const goalWords = goal.description.toLowerCase().split(/\s+/);
            for (const word of goalWords) {
                if (word.length > 4 && (lowerTitle.includes(word) || lowerTags.includes(word))) {
                    return 90; // Direct alignment
                }
            }
        }

        // Tangential indicators
        const leverageKeywords = ['build', 'ship', 'launch', 'create', 'develop', 'implement', 'customer', 'user', 'product'];
        if (leverageKeywords.some(kw => lowerTitle.includes(kw))) {
            return 60; // Tangentially related
        }

        return 30; // No clear connection
    }

    /**
     * IMPACT_MAGNITUDE: If completed, how much value does this create?
     */
    calculateImpactMagnitude(task, userContext) {
        // Base score from importance
        let impact = task.importance * 20; // 1-5 → 20-100

        // Revenue impact (via tags)
        if (task.tags.some(tag => ['client', 'revenue', 'sales', 'deal', 'contract'].includes(tag.toLowerCase()))) {
            impact = Math.min(100, impact + 15);
        }

        // Learning/skill building
        if (task.tags.some(tag => ['learn', 'study', 'research', 'read'].includes(tag.toLowerCase()))) {
            impact = Math.min(100, impact + 10);
        }

        return impact;
    }

    /**
     * TIME_EFFICIENCY: Shorter tasks score higher (quick wins bias)
     * Formula: min(100, 60 / estimated_minutes × 100)
     */
    calculateTimeEfficiency(task, userContext) {
        if (task.estimatedMinutes <= 0) return 50;
        return Math.min(100, (60 / task.estimatedMinutes) * 100);
    }

    /**
     * DEADLINE_PROXIMITY: Closer deadlines score higher
     * Formula: max(0, 100 - (hours_until_deadline / 2))
     */
    calculateDeadlineProximity(task, userContext) {
        if (!task.deadline) return 30; // No deadline - neutral score

        const deadline = new Date(task.deadline);
        const hoursUntil = (deadline - new Date()) / (1000 * 60 * 60);

        if (hoursUntil <= 0) return 100; // Overdue
        if (hoursUntil <= 2) return 95;
        if (hoursUntil <= 8) return 85;
        if (hoursUntil <= 24) return 70;
        if (hoursUntil <= 48) return 50;
        if (hoursUntil <= 168) return 30; // 1 week

        return 10; // Distant deadline
    }

    /**
     * ENERGY_FIT: Does this match the user's current energy level?
     */
    calculateEnergyFit(task, userContext) {
        // Determine task energy requirement
        let requiredEnergy = 3;

        const highEnergyKeywords = ['create', 'design', 'build', 'solve', 'analyze', 'strategy'];
        const lowEnergyKeywords = ['email', 'review', 'check', 'update', 'organize'];

        const lowerTitle = task.title.toLowerCase();

        if (highEnergyKeywords.some(kw => lowerTitle.includes(kw))) {
            requiredEnergy = 5;
        } else if (lowEnergyKeywords.some(kw => lowerTitle.includes(kw))) {
            requiredEnergy = 2;
        }

        // Match score: 100 if perfect match, decreases with difference
        const energyDiff = Math.abs(requiredEnergy - userContext.energyLevel);
        return Math.max(0, 100 - (energyDiff * 20));
    }

    /**
     * Step 3: Apply Strategic Adjustments
     */
    applyStrategicAdjustments(task, userContext) {
        let roi = task.roiScore;

        // Chronic rollover penalty (-15 points)
        if (task.rolloverCount >= 3) {
            roi -= 15;
        }

        // Recurring task bonus (+10 points)
        if (task.tags.some(tag => tag.toLowerCase() === 'recurring')) {
            roi += 10;
        }

        // Client/Revenue multiplier (×1.2 on impact portion already applied)

        // Quick win bonus (≤30 min + importance ≥3)
        if (task.estimatedMinutes <= 30 && task.importance >= 3) {
            roi += 10;
        }

        return roi;
    }

    /**
     * Step 4: Determine final classification based on ROI and context
     */
    classifyTask(task, userContext) {
        // Already classified by heuristics
        if (['T1', 'T4', 'T5'].includes(task.classification)) {
            return task.classification;
        }

        // T2 LEVERAGE: High ROI, important but not urgent (classic Q2)
        if (task.roiScore >= 60 && task.importance >= 4 && task.urgency <= 3) {
            task.reason = 'LEVERAGE: High-impact strategic work - protect this time';
            return 'T2';
        }

        // T1 CRITICAL: High ROI + urgent
        if (task.roiScore >= 70 && task.urgency >= 4) {
            task.reason = 'CRITICAL: High priority with urgency - do now';
            return 'T1';
        }

        // T3 INTERRUPTION: Urgent but low importance
        if (task.urgency >= 4 && task.importance <= 2) {
            task.reason = 'INTERRUPTION: Urgent but low value - delegate or defer';
            return 'T3';
        }

        // T2 LEVERAGE: Default for high ROI tasks
        if (task.roiScore >= 50) {
            task.reason = 'LEVERAGE: Good ROI - schedule intentionally';
            return 'T2';
        }

        // T3 INTERRUPTION: Default for medium ROI tasks
        if (task.roiScore >= 30) {
            task.reason = 'INTERRUPTION: Moderate value - fit in around priorities';
            return 'T3';
        }

        // T4 DISTRACTION: Low ROI
        task.reason = 'DISTRACTION: Low ROI - consider deletion';
        return 'T4';
    }

    /**
     * Get the recommended action (single highest-ROI task)
     */
    getRecommendedAction(tasks, userContext) {
        const triaged = this.triageTasks(tasks, userContext);
        
        // Filter tasks that fit in available time and energy
        const fitTasks = triaged.filter(task => {
            // Time budget: don't recommend tasks >80% of available time
            if (task.estimatedMinutes > userContext.availableMinutes * 0.8) {
                return false;
            }

            // Energy fit: skip tasks that require more energy than available
            const taskEnergyReq = task.importance >= 4 ? 5 : 3;
            if (taskEnergyReq > userContext.energyLevel + 1) {
                return false;
            }

            // Exclude T4 and T5 from recommendations
            if (task.classification === 'T4' || task.classification === 'T5') {
                return false;
            }

            return true;
        });

        if (fitTasks.length === 0) {
            return {
                task: null,
                why: "No tasks fit your current time/energy constraints. Great job clearing your queue!"
            };
        }

        const topTask = fitTasks[0];
        
        let why = "";
        switch (topTask.classification) {
            case 'T1':
                why = `CRITICAL: Has ${topTask.urgency}/5 urgency and directly impacts your goals. Clear everything else.`;
                break;
            case 'T2':
                why = `LEVERAGE: High ROI (${topTask.roiScore}) strategic work. This is what moves the needle.`;
                break;
            case 'T3':
                why = `INTERRUPTION: Needs attention but don't let it derail your important work.`;
                break;
            default:
                why = `Recommended based on ROI score of ${topTask.roiScore}.`;
        }

        return {
            task: topTask,
            why: why
        };
    }
}

// ============================================================================
// FOCUS MODE MANAGER
// ============================================================================

class FocusModeManager {
    constructor() {
        this.active = false;
        this.currentTask = null;
        this.timerInterval = null;
        this.remainingSeconds = 25 * 60; // Default 25 minutes
        this.elapsedSeconds = 0;
    }

    /**
     * Enter Focus Mode with the specified task
     * Locks all UI elements except the task card
     */
    enter(task) {
        if (!task) {
            console.error('Cannot enter focus mode without a task');
            return;
        }

        this.active = true;
        this.currentTask = task;
        
        // Set timer based on task estimate (cap at 60 min)
        const minutes = Math.min(60, Math.max(25, Math.round(task.estimatedMinutes / 10) * 10));
        this.remainingSeconds = minutes * 60;
        this.elapsedSeconds = 0;

        // Show focus overlay
        const overlay = document.getElementById('focusOverlay');
        overlay.classList.add('active');

        // Update focus UI
        this.updateFocusUI();

        // Start timer
        this.startTimer();

        // Update dashboard status
        this.updateDashboardStatus();
    }

    /**
     * Exit Focus Mode
     */
    exit() {
        this.active = false;
        this.stopTimer();

        const overlay = document.getElementById('focusOverlay');
        overlay.classList.remove('active');

        this.updateDashboardStatus();
    }

    /**
     * Pause the focus timer
     */
    pause() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Resume the focus timer
     */
    resume() {
        this.startTimer();
    }

    /**
     * Start the countdown timer
     */
    startTimer() {
        this.stopTimer(); // Clear any existing timer

        this.timerInterval = setInterval(() => {
            if (this.remainingSeconds > 0) {
                this.remainingSeconds--;
                this.elapsedSeconds++;
                this.updateTimerDisplay();
                this.updateProgressDisplay();
            } else {
                this.pause();
                this.notifyFocusComplete();
            }
        }, 1000);
    }

    /**
     * Stop the countdown timer
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Update the timer display
     */
    updateTimerDisplay() {
        const minutes = Math.floor(this.remainingSeconds / 60);
        const seconds = this.remainingSeconds % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const timerEl = document.getElementById('focusTimer');
        if (timerEl) timerEl.textContent = display;

        // Update document title
        document.title = `${display} - Solo Chief Focus`;
    }

    /**
     * Update the progress display
     */
    updateProgressDisplay() {
        if (!this.currentTask) return;

        const totalTime = this.remainingSeconds + this.elapsedSeconds;
        const progress = (this.elapsedSeconds / totalTime) * 100;

        const progressFill = document.getElementById('focusProgressFill');
        if (progressFill) progressFill.style.width = `${progress}%`;
    }

    /**
     * Update the focus UI elements
     */
    updateFocusUI() {
        const titleEl = document.getElementById('focusTaskTitle');
        const whyEl = document.getElementById('focusTaskWhy');

        if (titleEl) titleEl.textContent = this.currentTask.title;
        if (whyEl) whyEl.textContent = this.currentTask.reason || this.currentTask.why;

        this.updateTimerDisplay();
        this.updateProgressDisplay();
    }

    /**
     * Update dashboard status badge
     */
    updateDashboardStatus() {
        const badge = document.getElementById('statusBadge');
        const text = document.getElementById('statusText');

        if (this.active) {
            badge.classList.add('focused');
            badge.style.borderColor = 'var(--accent)';
            badge.style.color = 'var(--accent)';
            badge.style.background = 'rgba(233, 69, 96, 0.1)';
            text.textContent = 'Focus Active';
        } else {
            badge.classList.remove('focused');
            badge.style.borderColor = 'var(--success)';
            badge.style.color = 'var(--success)';
            badge.style.background = 'rgba(0, 217, 165, 0.1)';
            text.textContent = 'Ready';
        }
    }

    /**
     * Notify when focus session is complete
     */
    notifyFocusComplete() {
        alert(`✨ Focus session complete!\n\nYou worked on: ${this.currentTask.title}\n\nTime to take a break before your next focus block.`);
    }
}

// ============================================================================
// DASHBOARD CONTROLLER
// ============================================================================

class DashboardController {
    constructor() {
        this.tasks = [];
        this.userContext = new UserContext();
        this.triageEngine = new StrategicTriageEngine();
        this.focusManager = new FocusModeManager();
        this.currentFilter = 'all';
        
        this.loadSampleData();
        this.init();
    }

    /**
     * Initialize dashboard
     */
    init() {
        this.renderTasks();
        this.updateOneThing();
        this.updateStats();
        this.loadFromLocalStorage();
    }

    /**
     * Load sample data for demonstration
     */
    loadSampleData() {
        this.tasks = [
            new Task(1, 'Finalize Q1 pricing proposal for Enterprise client', 45, 5, 4, new Date(Date.now() + 24*60*60*1000).toISOString().slice(0, 16), ['client', 'revenue'], '$50K deal at risk'),
            new Task(2, 'Review analytics dashboard', 20, 3, 2, null, ['analytics']),
            new Task(3, 'Think about newsletter redesign', 90, 2, 1, null, ['newsletter']),
            new Task(4, 'Respond to vendor email', 5, 2, 4, null, ['email']),
            new Task(5, 'Ship One Thing Lock feature prototype', 90, 5, 3, new Date(Date.now() + 48*60*60*1000).toISOString().slice(0, 16), ['product', 'ship'], 'Core feature for MVP'),
            new Task(6, 'Check Twitter mentions', 10, 1, 2, null, ['social']),
            new Task(7, 'Plan Q2 strategy', 60, 4, 2, null, ['strategy']),
            new Task(8, 'Organize desktop files', 30, 1, 1, null, ['admin']),
        ];

        // Run initial triage
        this.triageEngine.triageTasks(this.tasks, this.userContext);
    }

    /**
     * Add a new task
     */
    addTask(title, time, importance, urgency, deadline) {
        const id = Date.now();
        const task = new Task(
            id,
            title,
            time,
            parseInt(importance),
            parseInt(urgency),
            deadline,
            [],
            ''
        );

        this.tasks.push(task);
        this.saveToLocalStorage();
        
        // Re-run triage
        this.triageEngine.triageTasks(this.tasks, this.userContext);
        
        this.renderTasks();
        this.updateOneThing();
        this.updateStats();
    }

    /**
     * Complete a task
     */
    completeTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = true;
            this.userContext.completedToday++;
            
            // Update focus time if in focus mode
            if (this.focusManager.active && this.focusManager.currentTask?.id === taskId) {
                const focusMinutes = this.focusManager.elapsedSeconds / 60;
                this.userContext.focusTimeMinutes += focusMinutes;
                this.focusManager.exit();
            }

            this.saveToLocalStorage();
            this.renderTasks();
            this.updateOneThing();
            this.updateStats();
        }
    }

    /**
     * Delete a task
     */
    deleteTask(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.userContext.distractionsBlocked++;
        this.saveToLocalStorage();
        this.renderTasks();
        this.updateOneThing();
        this.updateStats();
    }

    /**
     * Roll over a task to tomorrow
     */
    rolloverTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.rolloverCount++;
            
            // Move deadline to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            task.deadline = tomorrow.toISOString().slice(0, 16);

            this.saveToLocalStorage();
            this.renderTasks();
            this.updateOneThing();
        }
    }

    /**
     * Enter focus mode for a task
     */
    enterFocusMode(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            this.focusManager.enter(task);
        }
    }

    /**
     * Exit focus mode
     */
    exitFocusMode() {
        this.focusManager.exit();
        document.title = 'Solo Chief - Dashboard';
    }

    /**
     * Render the task list
     */
    renderTasks() {
        const taskList = document.getElementById('taskList');
        const taskCount = document.getElementById('taskCount');

        // Filter tasks
        let filteredTasks = this.tasks.filter(t => !t.completed);
        
        if (this.currentFilter === 'critical') {
            filteredTasks = filteredTasks.filter(t => t.classification === 'T1');
        } else if (this.currentFilter === 'leverage') {
            filteredTasks = filteredTasks.filter(t => t.classification === 'T2');
        } else if (this.currentFilter === 'today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            filteredTasks = filteredTasks.filter(t => {
                if (!t.deadline) return false;
                const deadline = new Date(t.deadline);
                return deadline.toDateString() === today.toDateString();
            });
        }

        // Sort by ROI score
        filteredTasks.sort((a, b) => b.roiScore - a.roiScore);

        taskCount.textContent = `${filteredTasks.length} tasks`;

        if (filteredTasks.length === 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <p>No tasks found. Add a new task or change your filter!</p>
                </div>
            `;
            return;
        }

        taskList.innerHTML = filteredTasks.map(task => this.renderTaskItem(task)).join('');
    }

    /**
     * Render a single task item
     */
    renderTaskItem(task) {
        const tierClass = task.classification?.toLowerCase() || 't5';
        const tierName = this.getTierName(task.classification);

        return `
            <div class="task-item ${tierClass}" data-id="${task.id}">
                <div class="task-header">
                    <div class="task-title">${task.title}</div>
                    <span class="task-tier tier-${tierClass}">${tierName}</span>
                </div>
                <div class="task-meta">
                    <span>⏱ ${task.estimatedMinutes}m</span>
                    <span>⭐ ${task.importance}/5</span>
                    <span>🔥 ${task.urgency}/5</span>
                    <span class="task-roi">ROI: ${task.roiScore}</span>
                </div>
                ${task.reason ? `<div class="task-meta" style="margin-top: 0.5rem; font-style: italic;">${task.reason}</div>` : ''}
                <div class="task-actions">
                    <button class="task-action-btn focus" onclick="dashboard.enterFocusMode(${task.id})">🔒 Focus</button>
                    <button class="task-action-btn complete" onclick="dashboard.completeTask(${task.id})">✓</button>
                    <button class="task-action-btn delete" onclick="dashboard.deleteTask(${task.id})">🗑</button>
                </div>
            </div>
        `;
    }

    /**
     * Get tier display name
     */
    getTierName(tier) {
        const names = {
            'T1': 'Critical',
            'T2': 'Leverage',
            'T3': 'Interrupt',
            'T4': 'Distract',
            'T5': 'Phantom'
        };
        return names[tier] || 'Unknown';
    }

    /**
     * Update the One Thing section
     */
    updateOneThing() {
        const recommendation = this.triageEngine.getRecommendedAction(this.tasks, this.userContext);
        const titleEl = document.getElementById('oneThingTitle');
        const whyEl = document.getElementById('oneThingWhy');
        const btn = document.getElementById('startFocusBtn');

        if (recommendation.task) {
            titleEl.textContent = recommendation.task.title;
            whyEl.textContent = recommendation.why;
            btn.disabled = false;
            btn.onclick = () => this.enterFocusMode(recommendation.task.id);
        } else {
            titleEl.textContent = recommendation.why.split(':')[1] || 'All tasks completed!';
            whyEl.textContent = 'Enjoy your free time or plan your next priority.';
            btn.disabled = true;
        }
    }

    /**
     * Update statistics
     */
    updateStats() {
        // Update stat cards
        document.getElementById('statCompleted').textContent = this.userContext.completedToday;
        document.getElementById('statBlocked').textContent = this.userContext.distractionsBlocked;
        document.getElementById('statFocusTime').textContent = `${Math.floor(this.userContext.focusTimeMinutes / 60)}h`;
        document.getElementById('statStreak').textContent = this.userContext.dayStreak;

        // Update triage summary
        const triaged = this.tasks.filter(t => !t.completed);
        document.getElementById('t1Count').textContent = triaged.filter(t => t.classification === 'T1').length;
        document.getElementById('t2Count').textContent = triaged.filter(t => t.classification === 'T2').length;
        document.getElementById('t3Count').textContent = triaged.filter(t => t.classification === 'T3').length;
        document.getElementById('t4Count').textContent = triaged.filter(t => t.classification === 'T4').length;
        document.getElementById('t5Count').textContent = triaged.filter(t => t.classification === 'T5').length;
    }

    /**
     * Filter tasks by category
     */
    filterTasks(filter) {
        this.currentFilter = filter;
        
        // Update tab styling
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.textContent.toLowerCase().includes(filter) || 
                (filter === 'all' && tab.textContent === 'All')) {
                tab.classList.add('active');
            }
        });

        this.renderTasks();
    }

    /**
     * Save tasks to localStorage
     */
    saveToLocalStorage() {
        const data = {
            tasks: this.tasks,
            userContext: this.userContext
        };
        localStorage.setItem('soloChiefData', JSON.stringify(data));
    }

    /**
     * Load tasks from localStorage
     */
    loadFromLocalStorage() {
        const data = localStorage.getItem('soloChiefData');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                if (parsed.tasks) {
                    this.tasks = parsed.tasks;
                    // Re-hydrate Task objects
                    this.tasks = this.tasks.map(t => {
                        const task = new Task(t.id, t.title, t.estimatedMinutes, t.importance, t.urgency, t.deadline, t.tags, t.notes);
                        Object.assign(task, t);
                        return task;
                    });
                    // Re-run triage on loaded tasks
                    this.triageEngine.triageTasks(this.tasks, this.userContext);
                    this.renderTasks();
                    this.updateOneThing();
                    this.updateStats();
                }
                if (parsed.userContext) {
                    this.userContext = { ...this.userContext, ...parsed.userContext };
                }
            } catch (e) {
                console.error('Failed to load from localStorage:', e);
            }
        }
    }
}

// ============================================================================
// GLOBAL INITIALIZATION
// ============================================================================

// Create dashboard instance
let dashboard;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new DashboardController();
});

// Global functions for HTML event handlers
function addTask(event) {
    event.preventDefault();
    
    const title = document.getElementById('taskTitle').value;
    const time = document.getElementById('taskTime').value || 30;
    const importance = document.getElementById('taskImportance').value;
    const urgency = document.getElementById('taskUrgency').value;
    const deadline = document.getElementById('taskDeadline').value;

    if (title.trim()) {
        dashboard.addTask(title, time, importance, urgency, deadline);
        
        // Clear form
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskTime').value = '';
        document.getElementById('taskDeadline').value = '';
    }
}

function filterTasks(filter) {
    dashboard.filterTasks(filter);
}

function enterFocusMode(taskId) {
    dashboard.enterFocusMode(taskId);
}

function exitFocusMode() {
    dashboard.exitFocusMode();
}

function completeFocusedTask() {
    if (dashboard.focusManager.active && dashboard.focusManager.currentTask) {
        dashboard.completeTask(dashboard.focusManager.currentTask.id);
    }
}

function pauseFocus() {
    const overlay = document.getElementById('focusOverlay');
    if (overlay.classList.contains('active')) {
        // Pause
        dashboard.focusManager.pause();
        alert('Focus paused. Take a break, then refresh to resume (full pause/resume UI coming soon).');
    }
}
