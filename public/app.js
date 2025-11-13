class CampingApp {
    constructor() {
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.dashboard = document.getElementById('dashboard');
        this.messageContainer = document.getElementById('messageContainer');
        
        // Modal system
        this.modalOverlay = document.getElementById('modalOverlay');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalBody = document.getElementById('modalBody');
        this.modalClose = document.getElementById('modalClose');
        
        // Modal event listeners
        this.modalClose.addEventListener('click', () => this.closeModal());
        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) {
                this.closeModal();
            }
        });
        
        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalOverlay.classList.contains('show')) {
                this.closeModal();
            }
        });
        this.currentUser = null;
        this.trips = [];
        
        this.initEventListeners();
        this.checkAuthStatus();
    }

    initEventListeners() {
        // Form switching
        document.getElementById('showRegister').addEventListener('click', () => this.showRegisterForm());
        document.getElementById('showLogin').addEventListener('click', () => this.showLoginForm());
        
        // Form submissions
        document.getElementById('loginFormElement').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerFormElement').addEventListener('submit', (e) => this.handleRegister(e));
        
        // Header actions (available when logged in)
        document.getElementById('headerLogoutBtn').addEventListener('click', () => this.handleLogout());
        document.getElementById('headerUserProfileBtn').addEventListener('click', () => this.showUserProfile(this.currentUser.id));
        
        // Profile actions
        document.getElementById('backFromProfileBtn').addEventListener('click', () => this.showMyTripsView());
        document.getElementById('editProfileBtn').addEventListener('click', () => this.showEditProfile());
        document.getElementById('cancelEditProfileBtn').addEventListener('click', () => this.showProfileView());
        document.getElementById('cancelEditProfileBtn2').addEventListener('click', () => this.showProfileView());
        document.getElementById('updateProfileForm').addEventListener('submit', (e) => this.handleUpdateProfile(e));
        
        // Main action buttons
        document.getElementById('createTripBtn').addEventListener('click', () => this.showCreateTripModal());
        document.getElementById('joinTripBtn').addEventListener('click', () => this.showJoinTripModal());
        document.getElementById('browseTripsBtn').addEventListener('click', () => this.showBrowseTripsView());
        document.getElementById('browseTripsBtn-mobile').addEventListener('click', () => this.showBrowseTripsView());
        document.getElementById('backToMyTripsBtn').addEventListener('click', () => this.showMyTripsView());
        
        // Inline form actions
        document.getElementById('cancelCreateTripBtn').addEventListener('click', () => this.hideCreateTripSection());
        document.getElementById('cancelCreateTripBtn2').addEventListener('click', () => this.hideCreateTripSection());
        document.getElementById('createTripForm').addEventListener('submit', (e) => this.handleCreateTrip(e));
        
        // Set minimum date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('tripStartDate').min = tomorrow.toISOString().split('T')[0];
        document.getElementById('tripEndDate').min = tomorrow.toISOString().split('T')[0];
        
        // Update end date minimum when start date changes
        document.getElementById('tripStartDate').addEventListener('change', (e) => {
            const startDate = new Date(e.target.value);
            startDate.setDate(startDate.getDate() + 1);
            document.getElementById('tripEndDate').min = startDate.toISOString().split('T')[0];
        });
        
        // Show/hide trip code display based on visibility selection
        document.getElementById('tripPrivate').addEventListener('change', () => {
            if (document.getElementById('tripPrivate').checked) {
                this.generateTripCode();
                document.getElementById('tripCodeDisplay').classList.remove('hidden');
            }
        });
        
        document.getElementById('tripPublic').addEventListener('change', () => {
            if (document.getElementById('tripPublic').checked) {
                document.getElementById('tripCodeDisplay').classList.add('hidden');
            }
        });
    }

    showRegisterForm() {
        this.loginForm.classList.add('hidden');
        this.registerForm.classList.remove('hidden');
        this.clearMessages();
    }

    showLoginForm() {
        this.registerForm.classList.add('hidden');
        this.loginForm.classList.remove('hidden');
        this.clearMessages();
    }

    showAuthForms() {
        // Hide dashboard and show auth forms
        document.getElementById('dashboardContainer').classList.add('hidden');
        document.getElementById('authContainer').classList.remove('hidden');
        
        // Hide user info in header
        document.getElementById('headerUserSection').classList.add('hidden');
        
        // Show login form by default
        this.showLoginForm();
        
        // Clear current user
        this.currentUser = null;
    }

    showDashboard(user) {
        this.currentUser = user;
        document.getElementById('authContainer').classList.add('hidden');
        document.getElementById('dashboardContainer').classList.remove('hidden');
        
        // Make sure trip details section is hidden on dashboard load
        const detailsSection = document.getElementById('tripDetailsSection');
        if (detailsSection) {
            detailsSection.classList.add('hidden');
            detailsSection.style.display = 'none';
        }
        
        // Show user info in header
        document.getElementById('headerUserSection').classList.remove('hidden');
        document.getElementById('headerUserName').textContent = `${user.firstName} ${user.lastName}`;
        
        // Load dashboard data
        this.loadDashboardData();
    }

    async loadDashboardData() {
        try {
            // Load all necessary data in parallel
            const results = await Promise.allSettled([
                this.loadMyTrips(),
                this.loadDashboardTasks(),
                this.loadDashboardShopping(),
                this.loadUserProfile()
            ]);
            
            // Check for any failed requests
            const failures = results.filter(result => result.status === 'rejected');
            if (failures.length > 0) {
                console.warn('Some dashboard data failed to load:', failures);
            }
            
            // Update dashboard sections
            this.updateDashboardUpcomingTrips();
            this.updateDashboardStats();
            this.updateRecentActivity();
            this.updateWeatherInsights();
            this.updateProfileCompleteness();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showMessage('Failed to load dashboard data', 'error');
        }
    }

    async loadDashboardTasks() {
        try {
            // Get tasks assigned to current user across all trips
            const response = await fetch('/api/tasks/my-tasks', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.userTasks = data.tasks || [];
                this.renderDashboardTasks();
            } else {
                // Silently handle task loading failure
                this.userTasks = [];
                this.renderDashboardTasks();
            }
        } catch (error) {
            // Silently handle task loading failure
            this.userTasks = [];
            this.renderDashboardTasks();
        }
    }

    renderDashboardTasks() {
        const container = document.getElementById('dashboardTasks');
        const taskCount = document.getElementById('taskCount');
        
        if (!this.userTasks || this.userTasks.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <span class="material-icons text-4xl mb-2 opacity-50">task_alt</span>
                    <p class="ios-callout">No tasks assigned yet</p>
                </div>
            `;
            taskCount.textContent = '0';
            return;
        }

        // Calculate progress
        const completedTasks = this.userTasks.filter(task => task.is_completed);
        const totalTasks = this.userTasks.length;
        const pendingTasks = this.userTasks.filter(task => !task.is_completed);
        
        taskCount.textContent = pendingTasks.length;

        // Add progress bar at the top
        const progressHtml = `
            <div class="mb-4 p-3 rounded-lg" style="background: var(--ios-gray-6);">
                ${this.getProgressBar(completedTasks.length, totalTasks, 'task')}
            </div>
        `;

        if (pendingTasks.length === 0) {
            container.innerHTML = progressHtml + `
                <div class="text-center py-8 text-gray-500">
                    <span class="material-icons text-4xl mb-2 opacity-50" style="color: var(--ios-green);">check_circle</span>
                    <p class="ios-callout">All tasks completed! 🎉</p>
                </div>
            `;
            return;
        }

        // Show up to 5 most urgent tasks
        const tasksToShow = pendingTasks.slice(0, 5);
        
        container.innerHTML = progressHtml + tasksToShow.map(task => {
            const isOverdue = task.due_date && new Date(task.due_date) < new Date();
            const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : null;
            
            return `
                <div class="flex items-center justify-between p-3 rounded-lg" style="background: var(--ios-gray-6);">
                    <div class="flex-1 min-w-0">
                        <h4 class="ios-callout font-medium truncate">${task.title}</h4>
                        <p class="ios-footnote text-gray-600 truncate">${task.trip_title}</p>
                        ${dueDate ? `
                            <p class="ios-caption ${isOverdue ? 'text-red-600' : 'text-gray-500'}">
                                ${isOverdue ? '⚠️ Overdue: ' : 'Due: '}${dueDate}
                            </p>
                        ` : ''}
                    </div>
                    <button onclick="app.toggleTaskCompletion(${task.id}, ${task.trip_id})" 
                            class="ml-3 p-2 rounded-full transition-colors"
                            style="min-height: 44px; min-width: 44px;"
                            onmouseover="this.style.backgroundColor='var(--bg-hover)'; this.style.color='var(--text-primary)'"
                            onmouseout="this.style.backgroundColor=''; this.style.color=''">
                        <span class="material-icons text-gray-400">radio_button_unchecked</span>
                    </button>
                </div>
            `;
        }).join('');

        if (pendingTasks.length > 5) {
            container.innerHTML += `
                <div class="text-center pt-3">
                    <button class="ios-footnote text-blue-600 hover:text-blue-800">
                        View ${pendingTasks.length - 5} more tasks
                    </button>
                </div>
            `;
        }
    }

    async loadTripStatistics() {
        try {
            const response = await fetch('/api/trips/my-stats', {
                credentials: 'include'
            });

            if (response.ok) {
                const stats = await response.json();
                this.updateTripStatistics(stats);
            }
        } catch (error) {
            console.error('Error loading trip statistics:', error);
        }
    }

    updateTripStatistics(stats = {}) {
        document.getElementById('totalTrips').textContent = stats.totalTrips || this.myTrips?.length || 0;
        document.getElementById('organizedTrips').textContent = stats.organizedTrips || 0;
        document.getElementById('joinedTrips').textContent = stats.joinedTrips || 0;
        document.getElementById('completedTasks').textContent = stats.completedTasks || 0;
    }

    updateDashboardUpcomingTrips() {
        const container = document.getElementById('dashboardUpcomingTrips');
        
        if (!this.myTrips || this.myTrips.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <span class="material-icons text-4xl mb-2 opacity-50">terrain</span>
                    <p class="ios-callout">No upcoming trips</p>
                    <button onclick="document.getElementById('createTripBtn').click()" 
                            class="ios-button-primary mt-4 mx-auto">
                        <span class="material-icons mr-2" style="font-size: 16px;">add_circle</span>Create Your First Trip
                    </button>
                </div>
            `;
            return;
        }

        // Show next 3 upcoming trips
        const upcomingTrips = this.myTrips
            .filter(trip => new Date(trip.start_date) >= new Date())
            .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
            .slice(0, 3);

        if (upcomingTrips.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <span class="material-icons text-4xl mb-2 opacity-50">event_available</span>
                    <p class="ios-callout">No upcoming trips scheduled</p>
                </div>
            `;
            return;
        }

        container.innerHTML = upcomingTrips.map(trip => {
            const startDate = new Date(trip.start_date);
            const daysUntil = Math.ceil((startDate - new Date()) / (1000 * 60 * 60 * 24));
            const isOrganizer = this.currentUser && this.currentUser.id === trip.organizer_id;
            
            return `
                <div class="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors"
                     onclick="app.showTripDetails(${trip.id})" style="border: 1px solid var(--ios-gray-5);">
                    <div class="flex-1 min-w-0">
                        <h4 class="ios-callout font-medium truncate">${trip.title}</h4>
                        <p class="ios-footnote text-gray-600 truncate">${trip.location}</p>
                        <p class="ios-caption text-gray-500">
                            ${daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                        </p>
                    </div>
                    <div class="flex items-center gap-2 ml-3">
                        ${isOrganizer ? `
                            <span class="px-2 py-1 rounded-full text-xs font-medium" style="background: var(--ios-blue); color: white;">
                                Organizer
                            </span>
                        ` : ''}
                        <span class="material-icons text-gray-400">chevron_right</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateRecentActivity() {
        const container = document.getElementById('recentActivity');
        
        // For now, show placeholder activity
        // This can be enhanced with real activity tracking later
        const activities = [
            { type: 'trip_created', message: 'Created a new trip', time: '2 hours ago', icon: 'add_circle' },
            { type: 'task_completed', message: 'Completed "Pack sleeping bags"', time: '1 day ago', icon: 'check_circle' },
            { type: 'trip_joined', message: 'Joined "Mountain Adventure"', time: '3 days ago', icon: 'group_add' }
        ];

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    <span class="material-icons text-3xl mb-2 opacity-50">timeline</span>
                    <p class="ios-footnote">No recent activity</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="flex items-center gap-3 p-2">
                <span class="material-icons text-gray-400" style="font-size: 20px;">${activity.icon}</span>
                <div class="flex-1 min-w-0">
                    <p class="ios-footnote truncate">${activity.message}</p>
                    <p class="ios-caption text-gray-500">${activity.time}</p>
                </div>
            </div>
        `).join('');
    }

    async loadDashboardShopping() {
        try {
            // Get shopping assignments for current user across all trips
            const response = await fetch('/api/shopping/my-assignments', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.userShoppingAssignments = data.assignments || [];
                this.userDietaryInfo = data.dietary_info || [];
                this.renderDashboardShopping();
            } else {
                console.error('Failed to load shopping assignments');
            }
        } catch (error) {
            console.error('Error loading shopping assignments:', error);
        }
    }

    renderDashboardShopping() {
        const container = document.getElementById('dashboardShopping');
        const shoppingCount = document.getElementById('shoppingCount');
        
        if (!this.userShoppingAssignments || this.userShoppingAssignments.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <span class="material-icons text-4xl mb-2 opacity-50">shopping_basket</span>
                    <p class="ios-callout">No shopping assignments yet</p>
                </div>
            `;
            shoppingCount.textContent = '0';
            return;
        }

        // Calculate progress
        const purchasedItems = this.userShoppingAssignments.filter(item => item.is_purchased);
        const totalItems = this.userShoppingAssignments.length;
        const pendingItems = this.userShoppingAssignments.filter(item => !item.is_purchased);
        
        shoppingCount.textContent = pendingItems.length;

        // Add progress bar at the top
        const progressHtml = `
            <div class="mb-4 p-3 rounded-lg" style="background: var(--ios-gray-6);">
                ${this.getProgressBar(purchasedItems.length, totalItems, 'shopping')}
            </div>
        `;

        // Show up to 5 most urgent shopping items
        const itemsToShow = pendingItems.slice(0, 5);
        
        container.innerHTML = progressHtml + itemsToShow.map(item => {
            const priorityColor = {
                'high': 'var(--ios-red)',
                'medium': 'var(--ios-orange)', 
                'low': 'var(--ios-gray-2)'
            }[item.priority] || 'var(--ios-gray-2)';
            
            return `
                <div class="flex items-center justify-between p-3 rounded-lg" style="background: var(--ios-gray-6);">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <h4 class="ios-callout font-medium truncate">${item.item_name}</h4>
                            <span class="w-2 h-2 rounded-full" style="background: ${priorityColor};" title="${item.priority} priority"></span>
                        </div>
                        <p class="ios-footnote text-gray-600 truncate">${item.trip_title}</p>
                        ${item.quantity > 1 ? `<p class="ios-caption text-gray-500">Qty: ${item.quantity}</p>` : ''}
                        ${item.estimated_cost ? `<p class="ios-caption text-gray-500">~$${item.estimated_cost}</p>` : ''}
                    </div>
                    <button onclick="app.toggleShoppingItemPurchased(${item.id})" 
                            class="ml-3 p-2 rounded-full transition-colors"
                            style="min-height: 44px; min-width: 44px;"
                            onmouseover="this.style.backgroundColor='var(--bg-hover)'; this.style.color='var(--text-primary)'"
                            onmouseout="this.style.backgroundColor=''; this.style.color=''">
                        <span class="material-icons text-gray-400">radio_button_unchecked</span>
                    </button>
                </div>
            `;
        }).join('');

        if (pendingItems.length > 5) {
            container.innerHTML += `
                <div class="text-center pt-3">
                    <button class="ios-footnote text-blue-600 hover:text-blue-800">
                        View ${this.userShoppingAssignments.length - 5} more items
                    </button>
                </div>
            `;
        }
    }

    async loadTripShopping(tripId) {
        try {
            const response = await fetch(`/api/shopping/trip/${tripId}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.renderTripShopping(tripId, data.items || [], data.dietary_restrictions || []);
            } else {
                console.error('Failed to load shopping items');
            }
        } catch (error) {
            console.error('Error loading shopping items:', error);
        }
    }

    renderTripShopping(tripId, items, dietaryRestrictions = []) {
        const container = document.getElementById(`shoppingList-${tripId}`);
        const countBadge = document.getElementById(`tripShoppingCount-${tripId}`);
        
        // Calculate progress
        const purchasedItems = items ? items.filter(item => item.is_purchased) : [];
        const totalItems = items ? items.length : 0;
        const pendingItems = items ? items.filter(item => !item.is_purchased) : [];
        
        // Update count badge with pending items
        if (countBadge) {
            countBadge.textContent = pendingItems.length;
        }
        
        // Create dietary restrictions summary
        let dietaryInfo = '';
        if (dietaryRestrictions && dietaryRestrictions.length > 0) {
            const restrictionsList = dietaryRestrictions.map(person => 
                `<span class="inline-block px-2 py-1 text-xs rounded-full mr-1 mb-1" style="background: var(--warning-orange); color: #000;">
                    ${person.first_name}: ${person.dietary_restrictions}
                </span>`
            ).join('');
            
            dietaryInfo = `
                <div class="mb-4 p-3 rounded-lg" style="background: var(--bg-card); border: 1px solid var(--warning-orange);">
                    <div class="flex items-center mb-2">
                        <span class="material-icons mr-2" style="font-size: 18px; color: var(--warning-orange);">restaurant_menu</span>
                        <span class="ios-footnote font-medium" style="color: var(--text-primary);">Dietary Restrictions to Consider</span>
                    </div>
                    <div class="flex flex-wrap">
                        ${restrictionsList}
                    </div>
                </div>
            `;
        }
        
        // Add progress bar
        const progressHtml = totalItems > 0 ? `
            <div class="mb-4 p-4 rounded-lg" style="background: var(--ios-gray-6);">
                ${this.getProgressBar(purchasedItems.length, totalItems, 'shopping')}
            </div>
        ` : '';

        if (!items || items.length === 0) {
            container.innerHTML = `
                ${dietaryInfo}
                <div class="text-center py-6 text-gray-500">
                    <span class="material-icons text-3xl mb-2 opacity-50">shopping_cart</span>
                    <p class="ios-callout">No shopping items yet</p>
                    <p class="ios-footnote">Add items to start planning your group shopping</p>
                </div>
            `;
            return;
        }

        // Group items by category
        const itemsByCategory = items.reduce((acc, item) => {
            const category = item.category || 'General';
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        }, {});

        let html = '';
        
        Object.entries(itemsByCategory).forEach(([category, categoryItems]) => {
            const categoryIcon = this.getCategoryIcon(category);
            const categoryColor = this.getCategoryColor(category);
            
            html += `
                <div class="mb-4">
                    <h4 class="ios-callout font-medium text-gray-700 mb-3 flex items-center">
                        <span class="material-icons mr-2" style="font-size: 18px; color: ${categoryColor};">${categoryIcon}</span>
                        ${category}
                    </h4>
                    <div class="space-y-2">
            `;
            
            categoryItems.forEach(item => {
                const isCompleted = item.is_purchased;
                const priorityColor = {
                    'high': 'var(--ios-red)',
                    'medium': 'var(--ios-orange)', 
                    'low': 'var(--ios-gray-2)'
                }[item.priority] || 'var(--ios-gray-2)';
                
                html += `
                    <div class="flex items-center justify-between p-3 rounded-lg ${isCompleted ? 'opacity-60' : ''}" 
                         style="background: var(--ios-gray-6); border-left: 3px solid ${priorityColor};">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <h5 class="ios-callout font-medium ${isCompleted ? 'line-through' : ''}">${item.item_name}</h5>
                                ${item.quantity > 1 ? `<span class="ios-caption text-gray-500">×${item.quantity}</span>` : ''}
                            </div>
                            ${item.description ? `<p class="ios-footnote text-gray-600 truncate">${item.description}</p>` : ''}
                            <div class="flex items-center gap-4 mt-1">
                                ${item.estimated_cost ? `<span class="ios-caption text-gray-500">~$${item.estimated_cost}</span>` : ''}
                                ${item.assigned_to !== 'anyone' ? `<span class="ios-caption text-blue-600">${this.getAssignmentText(item.assigned_to)}</span>` : ''}
                                ${isCompleted ? `<span class="ios-caption text-green-600">✓ Purchased by ${item.purchaser_first_name || 'someone'}</span>` : ''}
                            </div>
                        </div>
                        <div class="flex items-center gap-2 ml-3">
                            <button onclick="app.toggleShoppingItemPurchased(${item.id})" 
                                    class="p-2 rounded-full transition-colors"
                                    style="min-height: 44px; min-width: 44px;"
                                    onmouseover="this.style.backgroundColor='var(--bg-hover)'; this.style.color='var(--text-primary)'"
                                    onmouseout="this.style.backgroundColor=''; this.style.color=''">
                                <span class="material-icons ${isCompleted ? 'text-green-600' : 'text-gray-400'}">
                                    ${isCompleted ? 'check_circle' : 'radio_button_unchecked'}
                                </span>
                            </button>
                            <button onclick="app.editShoppingItem(${item.id})" 
                                    class="p-2 rounded-full transition-colors"
                                    style="min-height: 44px; min-width: 44px;"
                                    onmouseover="this.style.backgroundColor='var(--bg-hover)'; this.style.color='var(--text-primary)'"
                                    onmouseout="this.style.backgroundColor=''; this.style.color=''">
                                <span class="material-icons text-gray-400">edit</span>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = dietaryInfo + progressHtml + html;
    }

    updateDashboardStats() {
        if (!this.myTrips) return;
        
        // Calculate statistics
        const totalTrips = this.myTrips.length;
        const organizedTrips = this.myTrips.filter(trip => 
            this.currentUser && trip.organizer_id === this.currentUser.id
        ).length;
        const joinedTrips = totalTrips - organizedTrips;
        
        // Calculate completed tasks
        const completedTasks = this.userTasks ? 
            this.userTasks.filter(task => task.is_completed).length : 0;
        
        // Update DOM elements
        document.getElementById('totalTrips').textContent = totalTrips;
        document.getElementById('organizedTrips').textContent = organizedTrips;
        document.getElementById('joinedTrips').textContent = joinedTrips;
        document.getElementById('completedTasks').textContent = completedTasks;
    }

    updateWeatherInsights() {
        const container = document.getElementById('weatherInsights');
        if (!container) return;
        
        if (!this.myTrips || this.myTrips.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    <span class="material-icons text-3xl mb-2 opacity-50">wb_cloudy</span>
                    <p class="ios-footnote">No upcoming trips for weather insights</p>
                </div>
            `;
            return;
        }
        
        // Find next upcoming trip
        const now = new Date();
        const upcomingTrips = this.myTrips
            .filter(trip => new Date(trip.start_date) > now)
            .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        
        if (upcomingTrips.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    <span class="material-icons text-3xl mb-2 opacity-50">wb_sunny</span>
                    <p class="ios-footnote">No upcoming trips</p>
                </div>
            `;
            return;
        }
        
        const nextTrip = upcomingTrips[0];
        const daysUntil = Math.ceil((new Date(nextTrip.start_date) - now) / (1000 * 60 * 60 * 24));
        
        container.innerHTML = `
            <div class="p-4 rounded-lg" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-medium">${nextTrip.title}</h4>
                    <span class="text-xs opacity-80">${daysUntil} days</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                    <span class="material-icons" style="font-size: 16px;">location_on</span>
                    <span class="truncate">${nextTrip.location}</span>
                </div>
                <div class="mt-3 pt-3 border-t border-white border-opacity-20">
                    <button onclick="app.loadTripWeather(${nextTrip.id}); app.showTripDetails(${nextTrip.id})" 
                            class="text-xs text-white opacity-80 hover:opacity-100 flex items-center gap-1">
                        <span class="material-icons" style="font-size: 14px;">wb_cloudy</span>
                        View Weather Forecast
                    </button>
                </div>
            </div>
        `;
    }

    updateProfileCompleteness() {
        const container = document.getElementById('profileCompleteness');
        if (!container || !this.currentUser) return;
        
        // Calculate profile completeness
        const fields = [
            this.currentUser.firstName,
            this.currentUser.lastName,
            this.currentUser.email,
            this.currentUser.bio,
            this.currentUser.camperType,
            this.currentUser.phone,
            this.currentUser.homeAddress
        ];
        
        const completedFields = fields.filter(field => field && field.trim()).length;
        const totalFields = fields.length;
        const percentage = Math.round((completedFields / totalFields) * 100);
        
        let statusColor = 'var(--ios-red)';
        let statusText = 'Incomplete';
        let suggestion = 'Complete your profile for better trip matching';
        
        if (percentage >= 80) {
            statusColor = 'var(--ios-green)';
            statusText = 'Complete';
            suggestion = 'Your profile looks great!';
        } else if (percentage >= 60) {
            statusColor = 'var(--ios-orange)';
            statusText = 'Good';
            suggestion = 'Add a few more details to improve your profile';
        }
        
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; width: 100%; box-sizing: border-box;">
                <span style="font-size: 14px; font-weight: 500;">Profile Completeness</span>
                <span style="font-size: 12px; font-weight: 600; color: ${statusColor};">${percentage}%</span>
            </div>
            <div style="width: 100%; height: 8px; background-color: #e5e5e5; border-radius: 4px; overflow: hidden; position: relative; margin-bottom: 12px; box-sizing: border-box;">
                <div style="height: 100%; background: ${statusColor}; border-radius: 4px; transition: width 0.3s ease; width: ${percentage}%; max-width: 100%; position: absolute; top: 0; left: 0; box-sizing: border-box;"></div>
            </div>
            <p style="font-size: 12px; color: #666; margin-bottom: 12px; line-height: 1.3;">${suggestion}</p>
            ${percentage < 80 ? `
                <button onclick="console.log('Complete Profile button clicked'); app.showEditProfile();" 
                        class="ios-button-secondary ios-button-compact w-full">
                    <span class="material-icons mr-1" style="font-size: 14px;">edit</span>
                    Complete Profile
                </button>
            ` : ''}
        `;
    }

    async loadUserProfile() {
        if (!this.currentUser) return;
        
        try {
            const response = await fetch(`/api/profile/${this.currentUser.id}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                // Merge profile data with current user
                this.currentUser = { ...this.currentUser, ...data.user };
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    async loadTripWeather(tripId) {
        try {
            const response = await fetch(`/api/weather/trip/${tripId}/forecast`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.renderTripWeather(tripId, data);
            } else if (response.status === 400) {
                // Expected error for trips without coordinates - silent failure
                this.renderWeatherError(tripId, 'coordinates');
            } else {
                // Other errors - silent failure, no console logging
                this.renderWeatherError(tripId);
            }
        } catch (error) {
            // Network errors - silent failure, no console logging
            this.renderWeatherError(tripId);
        }
    }

    renderWeatherError(tripId, errorType = 'general') {
        const container = document.getElementById(`weatherForecast-${tripId}`);
        if (container) {
            if (errorType === 'coordinates') {
                container.innerHTML = `
                    <div class="text-center py-4 text-gray-500">
                        <span class="material-icons text-2xl mb-2 opacity-50">location_off</span>
                        <p class="ios-footnote">Weather forecast unavailable</p>
                        <p class="ios-caption text-xs">Trip location coordinates needed</p>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="text-center py-4 text-gray-500">
                        <span class="material-icons text-2xl mb-2 opacity-50">cloud_off</span>
                        <p class="ios-footnote">Weather forecast unavailable</p>
                        <p class="ios-caption text-xs">Check your internet connection</p>
                    </div>
                `;
            }
        }
    }

    renderTripWeather(tripId, weatherData) {
        const container = document.getElementById(`weatherForecast-${tripId}`);
        if (!container) return;

        // Current weather with proper validation
        const current = weatherData.current;
        const currentTemp = current.temp ? Math.round(current.temp) : '--';
        const feelsLike = current.feels_like ? Math.round(current.feels_like) : '--';
        const humidity = current.humidity || '--';
        const windSpeed = current.wind_speed ? Math.round(current.wind_speed) : 0;
        const windDirection = this.getWindDirection(current.wind_deg);
        const uvIndex = current.uvi !== undefined ? Math.round(current.uvi) : 0;
        
        // 7-day forecast
        const daily = weatherData.daily.slice(0, 7);
        
        // Generate camping suggestions based on weather
        const suggestions = this.generateCampingSuggestions(current, daily);
        
        container.innerHTML = `
            <!-- Current Weather -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px; border-radius: 12px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="display: flex; align-items: center;">
                    <span class="material-icons" style="font-size: 48px; margin-right: 20px;">${this.getWeatherIcon(current.weather[0].main)}</span>
                    <div>
                        <div style="font-size: 36px; font-weight: 300; line-height: 1;">${currentTemp}°F</div>
                        <div style="font-size: 14px; opacity: 0.9; margin-top: 4px;">Feels like ${feelsLike}°F</div>
                        <div style="font-size: 14px; opacity: 0.8; margin-top: 2px; text-transform: capitalize;">${current.weather[0].description}</div>
                    </div>
                </div>
                <div style="text-align: right; font-size: 14px; opacity: 0.9;">
                    <div style="margin-bottom: 4px;">Now</div>
                    <div>${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                </div>
            </div>

            <!-- Camping Suggestions -->
            ${suggestions.length > 0 ? `
            <div class="ios-card mb-6">
                <div class="p-6">
                    <h4 class="ios-callout font-medium mb-4" style="color: var(--text-primary); display: flex; align-items: center;">
                        <span class="material-icons mr-2" style="font-size: 20px; color: var(--ios-orange);">lightbulb</span>
                        Camping Suggestions
                    </h4>
                    <div class="space-y-3">
                        ${suggestions.map(suggestion => `
                            <div class="flex items-start gap-3 p-3 rounded-lg" style="background: var(--ios-secondary-grouped-background); border: 1px solid var(--border-secondary);">
                                <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style="background: ${suggestion.color};">
                                    <span class="material-icons" style="font-size: 20px; color: white; font-weight: 500;">${suggestion.icon}</span>
                                </div>
                                <div class="flex-1">
                                    <div class="font-medium text-sm mb-1" style="color: var(--text-primary);">${suggestion.title}</div>
                                    <div class="text-sm" style="color: var(--text-secondary);">${suggestion.description}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Weather Details -->
            <div class="weather-details" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 32px; overflow-x: auto; padding: 0 4px;">
                <div style="text-align: center; padding: 16px; background: white; border-radius: 8px; border: 1px solid #E5E5EA;">
                    <span class="material-icons" style="font-size: 24px; color: #007AFF; margin-bottom: 8px; display: block;">air</span>
                    <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Wind</div>
                    <div style="font-size: 14px; font-weight: 600; color: #333;">${windSpeed < 1 ? 'Calm' : `${windSpeed} mph ${windDirection}`}</div>
                </div>
                <div style="text-align: center; padding: 16px; background: white; border-radius: 8px; border: 1px solid #E5E5EA;">
                    <span class="material-icons" style="font-size: 24px; color: #007AFF; margin-bottom: 8px; display: block;">water_drop</span>
                    <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Humidity</div>
                    <div style="font-size: 14px; font-weight: 600; color: #333;">${humidity !== '--' ? `${humidity}%` : 'N/A'}</div>
                </div>
                <div style="text-align: center; padding: 16px; background: white; border-radius: 8px; border: 1px solid #E5E5EA;">
                    <span class="material-icons" style="font-size: 24px; color: #007AFF; margin-bottom: 8px; display: block;">wb_sunny</span>
                    <div style="font-size: 12px; color: #666; margin-bottom: 4px;">UV Index</div>
                    <div style="font-size: 14px; font-weight: 600; color: #333;">${uvIndex !== undefined ? `${uvIndex} ${this.getUVLevel(uvIndex)}` : 'N/A'}</div>
                </div>
                <div style="text-align: center; padding: 16px; background: white; border-radius: 8px; border: 1px solid #E5E5EA;">
                    <span class="material-icons" style="font-size: 24px; color: #007AFF; margin-bottom: 8px; display: block;">visibility</span>
                    <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Visibility</div>
                    <div style="font-size: 14px; font-weight: 600; color: #333;">10 km</div>
                </div>
            </div>

            <!-- 7-Day Forecast -->
            <div class="weather-forecast-container" style="margin-bottom: 32px;">
                <div style="margin-bottom: 16px;">
                    <h4 style="font-size: 16px; font-weight: 600; color: #333; margin: 0;">7-Day Forecast</h4>
                </div>
                <div class="weather-forecast-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 12px; max-width: 100%;">
                    ${daily.map((day, index) => {
                        const date = new Date(day.dt * 1000);
                        const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
                        const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        
                        // Handle missing temperature data properly
                        const high = day.temp && day.temp.max ? Math.round(day.temp.max) : (day.temp ? Math.round(day.temp) : '--');
                        const low = day.temp && day.temp.min ? Math.round(day.temp.min) : '--';
                        const rainChance = day.pop ? Math.round(day.pop * 100) : 0;
                        const weatherMain = day.weather && day.weather[0] ? day.weather[0].main : 'Clear';
                        
                        return `
                            <div class="weather-day-card" style="text-align: center; padding: 16px 12px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; backdrop-filter: blur(10px); ${index === 0 ? 'background: rgba(0, 122, 255, 0.2); border-color: #007AFF;' : ''}">
                                <div style="font-size: 13px; font-weight: 700; color: ${index === 0 ? '#87CEEB' : '#ffffff'}; margin-bottom: 4px;">${dayName}</div>
                                <div style="font-size: 11px; color: #cccccc; margin-bottom: 8px; font-weight: 500;">${monthDay}</div>
                                <span class="material-icons" style="font-size: 28px; color: #87CEEB; margin-bottom: 8px; display: block;">${this.getWeatherIcon(weatherMain)}</span>
                                <div style="font-size: 16px; font-weight: bold; color: #ffffff; margin-bottom: 2px;">${high}°</div>
                                <div style="font-size: 13px; color: #cccccc; margin-bottom: 4px; font-weight: 500;">${low}°</div>
                                ${rainChance > 10 ? `<div style="font-size: 11px; color: #87CEEB; font-weight: 600;">💧${rainChance}%</div>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <!-- Camping Conditions -->
            <div style="background: #F0F9FF; border: 1px solid #0EA5E9; border-radius: 12px; padding: 24px;">
                <h4 style="font-size: 18px; font-weight: 600; color: #0F172A; margin: 0 0 20px 0; display: flex; align-items: center;">
                    <span class="material-icons" style="font-size: 24px; color: #0EA5E9; margin-right: 12px;">outdoor_grill</span>
                    Camping Conditions
                </h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    <div style="display: flex; align-items: center;">
                        <span class="material-icons" style="font-size: 20px; color: #0EA5E9; margin-right: 12px;">nights_stay</span>
                        <span style="font-size: 16px; color: #334155;">Night low: ${Math.round(daily[0].temp.min)}°F</span>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span class="material-icons" style="font-size: 20px; color: #0EA5E9; margin-right: 12px;">wb_twilight</span>
                        <span style="font-size: 16px; color: #334155;">Morning: ${Math.round(daily[0].temp.max)}°F</span>
                    </div>
                    ${windSpeed > 15 ? `
                    <div style="display: flex; align-items: center;">
                        <span class="material-icons" style="font-size: 20px; color: #F59E0B; margin-right: 12px;">warning</span>
                        <span style="font-size: 16px; color: #334155;">Windy conditions - secure gear</span>
                    </div>
                    ` : ''}
                    ${daily[0].pop > 0.3 ? `
                    <div style="display: flex; align-items: center;">
                        <span class="material-icons" style="font-size: 20px; color: #3B82F6; margin-right: 12px;">umbrella</span>
                        <span style="font-size: 16px; color: #334155;">Rain likely - waterproof setup</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Add refresh button event listener
        const refreshBtn = document.getElementById(`refreshWeatherBtn-${tripId}`);
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadTripWeather(tripId);
            });
        }

        // Add mobile refresh button event listener
        const refreshBtnMobile = document.getElementById(`refreshWeatherBtn-mobile-${tripId}`);
        if (refreshBtnMobile) {
            refreshBtnMobile.addEventListener('click', () => {
                this.loadTripWeather(tripId);
            });
        }
    }

    getWeatherIcon(weatherMain) {
        const iconMap = {
            'Clear': 'wb_sunny',
            'Clouds': 'cloud',
            'Rain': 'umbrella',
            'Drizzle': 'grain',
            'Thunderstorm': 'flash_on',
            'Snow': 'ac_unit',
            'Mist': 'foggy',
            'Fog': 'foggy',
            'Haze': 'foggy'
        };
        return iconMap[weatherMain] || 'wb_cloudy';
    }

    getStatusBadge(status) {
        const statusConfig = {
            'planning': {
                color: '#FFFFFF',
                background: '#007AFF',
                text: 'Planning',
                icon: 'schedule'
            },
            'active': {
                color: '#FFFFFF',
                background: '#34C759',
                text: 'Active',
                icon: 'play_circle'
            },
            'completed': {
                color: '#FFFFFF',
                background: '#8E8E93',
                text: 'Completed',
                icon: 'check_circle'
            }
        };

        const config = statusConfig[status] || statusConfig['planning'];
        
        return `
            <span class="px-3 py-1 text-xs rounded-full font-medium flex items-center" 
                  style="background: ${config.background} !important; color: ${config.color} !important; border: none !important;">
                <span class="material-icons mr-1" style="font-size: 14px !important; color: ${config.color} !important;">${config.icon}</span>
                ${config.text}
            </span>
        `;
    }

    getProgressBar(completed, total, type = 'default') {
        if (total === 0) {
            return `
                <div class="flex items-center text-sm text-gray-500">
                    <span class="material-icons mr-2" style="font-size: 16px;">info</span>
                    <span>No ${type}s yet</span>
                </div>
            `;
        }

        const percentage = Math.round((completed / total) * 100);
        const isComplete = completed === total;
        
        const colors = {
            tasks: { bg: '#E8F5E8', fill: '#34C759', icon: 'task_alt' },
            shopping: { bg: '#E6F2FF', fill: '#007AFF', icon: 'shopping_cart' },
            default: { bg: '#F2F2F7', fill: '#8E8E93', icon: 'analytics' }
        };
        
        const color = colors[type] || colors.default;
        
        return `
            <div class="progress-bar-container" style="display: flex; align-items: center; gap: 12px; width: 100%; min-width: 0; overflow: hidden; box-sizing: border-box;">
                <span class="material-icons" style="font-size: 16px; color: ${color.fill}; flex-shrink: 0;">${color.icon}</span>
                <div style="flex: 1; min-width: 0; overflow: hidden; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; width: 100%; box-sizing: border-box;">
                        <span style="font-size: 12px; font-weight: 500; color: ${isComplete ? color.fill : '#333'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%; box-sizing: border-box;">
                            ${completed}/${total} ${type}${completed === 1 ? '' : 's'} ${type === 'shopping' ? 'purchased' : 'completed'}
                        </span>
                        <span style="font-size: 10px; color: #666; flex-shrink: 0; margin-left: 8px;">${percentage}%</span>
                    </div>
                    <div style="width: 100%; height: 8px; background-color: #e5e5e5; border-radius: 4px; overflow: hidden; position: relative; box-sizing: border-box;">
                        <div style="height: 100%; background: ${color.fill}; border-radius: 4px; transition: width 0.3s ease; width: ${percentage}%; max-width: 100%; position: absolute; top: 0; left: 0; box-sizing: border-box;"></div>
                    </div>
                </div>
                ${isComplete ? `<span class="material-icons" style="font-size: 18px; color: #34C759; flex-shrink: 0;">check_circle</span>` : ''}
            </div>
        `;
    }

    getWindDirection(degrees) {
        if (!degrees) return '';
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    }

    getUVLevel(uvIndex) {
        if (uvIndex <= 2) return 'Low';
        if (uvIndex <= 5) return 'Moderate';
        if (uvIndex <= 7) return 'High';
        if (uvIndex <= 10) return 'Very High';
        return 'Extreme';
    }

    generateCampingSuggestions(current, daily) {
        const suggestions = [];
        const temp = current.temp || 70;
        const feelsLike = current.feels_like || temp;
        const windSpeed = current.wind_speed || 0;
        const humidity = current.humidity || 50;
        const uvIndex = current.uvi || 0;
        const weatherMain = current.weather?.[0]?.main || 'Clear';
        
        // Check for rain in forecast
        const rainDays = daily.filter(day => day.weather?.[0]?.main === 'Rain' || (day.pop && day.pop > 0.3)).length;
        const maxRainChance = Math.max(...daily.map(day => day.pop || 0)) * 100;
        
        // Temperature-based suggestions
        if (temp < 40) {
            suggestions.push({
                icon: 'ac_unit',
                color: 'var(--ios-blue)',
                title: 'Cold Weather Gear',
                description: `Bring a 4-season sleeping bag rated for ${Math.round(temp - 10)}°F or lower. Pack thermal layers and insulated boots.`
            });
            
            suggestions.push({
                icon: 'local_fire_department',
                color: 'var(--ios-red)',
                title: 'Campfire Essential',
                description: 'Cold conditions make a campfire crucial for warmth. Bring extra firewood and fire starters.'
            });
        } else if (temp < 60) {
            suggestions.push({
                icon: 'nightlight',
                color: 'var(--ios-purple)',
                title: 'Cool Weather Sleep',
                description: `A 3-season sleeping bag rated for ${Math.round(temp - 15)}°F should keep you comfortable. Consider a sleeping pad for insulation.`
            });
            
            suggestions.push({
                icon: 'checkroom',
                color: 'var(--ios-orange)',
                title: 'Layer Up',
                description: 'Pack layers including a warm jacket, fleece, and long pants. Mornings and evenings will be chilly.'
            });
        } else if (temp > 85) {
            suggestions.push({
                icon: 'wb_shade',
                color: 'var(--ios-green)',
                title: 'Stay Cool',
                description: 'Bring a lightweight, well-ventilated tent. Consider a portable fan and extra water for cooling.'
            });
            
            suggestions.push({
                icon: 'water_drop',
                color: 'var(--ios-blue)',
                title: 'Hydration Critical',
                description: `Hot weather increases dehydration risk. Bring 1+ gallons of water per person per day.`
            });
        }

        // Wind-based suggestions
        if (windSpeed > 15) {
            suggestions.push({
                icon: 'air',
                color: 'var(--ios-gray)',
                title: 'Windy Conditions',
                description: `${Math.round(windSpeed)} mph winds expected. Secure all gear, use extra tent stakes, and consider a windbreaker.`
            });
            
            suggestions.push({
                icon: 'shield',
                color: 'var(--ios-blue)',
                title: 'Wind Protection',
                description: 'Set up camp in a sheltered area if possible. Bring a tarp for additional wind protection.'
            });
        }

        // Rain/precipitation suggestions
        if (rainDays > 0 || weatherMain === 'Rain') {
            suggestions.push({
                icon: 'beach_access',
                color: 'var(--ios-blue)',
                title: 'Rain Gear Essential',
                description: `${rainDays > 1 ? 'Multiple days' : 'Rain'} expected. Pack waterproof jackets, rain pants, and an umbrella.`
            });
            
            suggestions.push({
                icon: 'water_drop',
                color: 'var(--ios-indigo)',
                title: 'Waterproof Everything',
                description: 'Use waterproof bags for electronics and clothes. Consider a tarp over your tent for extra protection.'
            });
            
            if (maxRainChance > 50) {
                suggestions.push({
                    icon: 'home',
                    color: 'var(--ios-brown)',
                    title: 'Shelter Planning',
                    description: 'High rain chance. Bring a large tarp or canopy for a dry gathering space outside your tent.'
                });
            }
        }

        // UV/Sun protection
        if (uvIndex > 6) {
            suggestions.push({
                icon: 'wb_sunny',
                color: 'var(--ios-orange)',
                title: 'Sun Protection',
                description: `UV Index ${Math.round(uvIndex)} (${this.getUVLevel(uvIndex)}). Bring SPF 30+ sunscreen, hat, and sunglasses. Seek shade during midday.`
            });
        }

        // Humidity suggestions
        if (humidity > 80) {
            suggestions.push({
                icon: 'opacity',
                color: 'var(--ios-teal)',
                title: 'High Humidity',
                description: 'Expect muggy conditions. Choose moisture-wicking clothing and ensure good tent ventilation.'
            });
        }

        // Feels-like temperature adjustments
        if (Math.abs(feelsLike - temp) > 10) {
            const feeling = feelsLike > temp ? 'hotter' : 'colder';
            suggestions.push({
                icon: 'thermostat',
                color: feelsLike > temp ? 'var(--ios-red)' : 'var(--ios-blue)',
                title: 'Temperature Feels Different',
                description: `Feels like ${Math.round(feelsLike)}°F (${Math.round(Math.abs(feelsLike - temp))}° ${feeling}). Plan clothing accordingly.`
            });
        }

        // General camping suggestions based on conditions
        if (weatherMain === 'Clear' && temp >= 60 && temp <= 80 && windSpeed < 10) {
            suggestions.push({
                icon: 'celebration',
                color: 'var(--ios-green)',
                title: 'Perfect Camping Weather',
                description: 'Ideal conditions! Great for outdoor activities, stargazing, and campfire gatherings.'
            });
        }

        // Limit to most important suggestions (max 6)
        return suggestions.slice(0, 6);
    }

    // Collapsible sections management with persistent state
    initializeCollapsibleSections(tripId) {
        // Map section is no longer collapsible - it's always visible
        // This method is kept for potential future collapsible sections
    }

    setCollapsibleState(content, chevron, isOpen) {
        if (isOpen) {
            content.classList.remove('collapsed');
            content.style.display = 'block';
            chevron.style.transform = 'rotate(0deg)';
            chevron.textContent = 'expand_less';
        } else {
            content.classList.add('collapsed');
            content.style.display = 'none';
            chevron.style.transform = 'rotate(180deg)';
            chevron.textContent = 'expand_more';
        }
    }

    saveCollapsibleState(key, isOpen) {
        const savedStates = JSON.parse(localStorage.getItem('sectionStates') || '{}');
        savedStates[key] = isOpen;
        localStorage.setItem('sectionStates', JSON.stringify(savedStates));
    }

    async geocodeLocation(location) {
        try {
            // Use a free geocoding service (Nominatim - OpenStreetMap)
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`, {
                headers: {
                    'User-Agent': 'GoTogether-App/1.0 (camping-app)'
                }
            });
            
            if (!response.ok) {
                console.error(`Geocoding HTTP error: ${response.status}`);
                return null;
            }
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lon: parseFloat(data[0].lon)
                };
            }
            return null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }

    createClickableUsername(name, userId) {
        if (!name || !userId) return name || 'Unknown User';
        
        return `<button onclick="app.showUserProfile(${userId})" 
                        class="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium transition-colors">
                    ${name}
                </button>`;
    }

    getCategoryIcon(category) {
        const icons = {
            'Food & Drinks': 'restaurant',
            'Camping Gear': 'outdoor_grill',
            'Safety & First Aid': 'medical_services',
            'Personal Items': 'person',
            'Entertainment': 'sports_esports',
            'Supplies & Tools': 'build',
            'Transportation': 'directions_car',
            'General': 'shopping_cart'
        };
        return icons[category] || 'shopping_cart';
    }

    getCategoryColor(category) {
        const colors = {
            'Food & Drinks': '#FF6B35',
            'Camping Gear': '#4ECDC4',
            'Safety & First Aid': '#FF3B30',
            'Personal Items': '#007AFF',
            'Entertainment': '#AF52DE',
            'Supplies & Tools': '#FF9500',
            'Transportation': '#34C759',
            'General': '#8E8E93'
        };
        return colors[category] || '#8E8E93';
    }

    getAssignmentText(assignedTo) {
        if (assignedTo === 'everyone') return 'Everyone';
        if (assignedTo === 'anyone') return 'Anyone';
        // For specific user assignments, we'd need to look up the user name
        return 'Assigned';
    }

    async toggleShoppingItemPurchased(itemId) {
        try {
            const response = await fetch(`/api/shopping/${itemId}/purchase`, {
                method: 'PATCH',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.showMessage(data.message || 'Shopping item updated!', 'success');
                
                // Reload shopping data
                this.loadDashboardShopping();
                // If we're on a trip details page, reload that too
                const currentTripId = this.getCurrentTripId();
                if (currentTripId) {
                    this.loadTripShopping(currentTripId);
                }
            } else {
                const errorData = await response.json();
                console.error('Shopping toggle error:', errorData);
                this.showMessage(errorData.error || 'Failed to update shopping item', 'error');
            }
        } catch (error) {
            console.error('Error toggling shopping item:', error);
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    getCurrentTripId() {
        // Helper to get current trip ID if we're viewing trip details
        const tripDetailsSection = document.getElementById('tripDetailsSection');
        if (tripDetailsSection && !tripDetailsSection.classList.contains('hidden')) {
            const addShoppingBtn = document.querySelector('[id^="addShoppingItemBtn-"]');
            if (addShoppingBtn) {
                return addShoppingBtn.dataset.tripId;
            }
        }
        return null;
    }

    // Modal System Functions
    showModal(title, content) {
        this.modalTitle.textContent = title;
        this.modalBody.innerHTML = content;
        this.modalOverlay.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    closeModal() {
        this.modalOverlay.classList.remove('show');
        document.body.style.overflow = ''; // Restore scrolling
        
        // Clear modal content after animation
        setTimeout(() => {
            this.modalBody.innerHTML = '';
        }, 300);
    }

    showCreateTripModal() {
        const modalContent = `
            <form id="modalCreateTripForm" class="modal-form">
                <div class="form-group">
                    <label for="modalTripTitle">Trip Title *</label>
                    <input type="text" id="modalTripTitle" name="title" required 
                           placeholder="Enter trip title">
                </div>
                
                <div class="form-group">
                    <label for="modalTripLocation">Location *</label>
                    <input type="text" id="modalTripLocation" name="location" required 
                           placeholder="Enter camping location (e.g., Yosemite National Park, CA)">
                    <small class="text-gray-500">Include city and state for best results</small>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="form-group">
                        <label for="modalStartDate">Start Date *</label>
                        <input type="date" id="modalStartDate" name="startDate" required>
                    </div>
                    <div class="form-group">
                        <label for="modalEndDate">End Date *</label>
                        <input type="date" id="modalEndDate" name="endDate" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="modalTripType">Trip Type *</label>
                    <select id="modalTripType" name="tripType" required>
                        <option value="">Select trip type</option>
                        <option value="car_camping">Car Camping</option>
                        <option value="backpacking">Backpacking</option>
                        <option value="rv_camping">RV Camping</option>
                        <option value="glamping">Glamping</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="modalDescription">Description</label>
                    <textarea id="modalDescription" name="description" rows="3"
                              placeholder="Describe the camping trip, what to expect, what to bring, etc."></textarea>
                </div>
                
                <div class="form-group">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="flex: 1;">
                            <div style="font-weight: 500; margin-bottom: 4px;">Make this trip public</div>
                            <div style="font-size: 14px; color: #666;">Others can find and join this trip</div>
                        </div>
                        <div id="publicSwitch" onclick="togglePublicTrip()" style="
                            width: 51px; 
                            height: 31px; 
                            background: #E5E5EA; 
                            border-radius: 16px; 
                            position: relative; 
                            cursor: pointer; 
                            transition: background-color 0.3s ease;
                            flex-shrink: 0;
                            margin-left: 16px;
                        ">
                            <div style="
                                width: 27px; 
                                height: 27px; 
                                background: white; 
                                border-radius: 50%; 
                                position: absolute; 
                                top: 2px; 
                                left: 2px; 
                                transition: transform 0.3s ease; 
                                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
                            "></div>
                        </div>
                        <input type="checkbox" id="modalIsPublic" name="isPublic" style="display: none;">
                    </div>
                </div>
                
                <div id="modalTripCodeSection" class="form-group">
                    <label>Trip Code</label>
                    <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                        <span class="material-icons text-gray-500">lock</span>
                        <div class="flex-1">
                            <div class="font-mono text-lg font-bold text-blue-600" id="modalGeneratedTripCode"></div>
                            <small class="text-gray-500">Share this code with others to let them join your private trip</small>
                        </div>
                        <button type="button" id="modalRegenerateTripCode" class="ios-button-secondary ios-button-compact">
                            <span class="material-icons mr-1" style="font-size: 14px;">refresh</span>New Code
                        </button>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="submit" class="ios-button-primary flex-1">
                        <span class="material-icons mr-2" style="font-size: 16px;">add_circle</span>Create Trip
                    </button>
                    <button type="button" onclick="app.closeModal()" class="ios-button-secondary">
                        Cancel
                    </button>
                </div>
            </form>
        `;
        
        this.showModal('Create New Trip', modalContent);
        
        // Set minimum dates to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        document.getElementById('modalStartDate').min = tomorrowStr;
        document.getElementById('modalEndDate').min = tomorrowStr;
        
        // Generate initial trip code and set private by default
        this.generateTripCode('modalGeneratedTripCode');
        
        // Handle public/private toggle
        const isPublicCheckbox = document.getElementById('modalIsPublic');
        const tripCodeSection = document.getElementById('modalTripCodeSection');
        
        // Trip is private by default, so show code section
        tripCodeSection.style.display = 'block';
        
        isPublicCheckbox.addEventListener('change', () => {
            if (isPublicCheckbox.checked) {
                tripCodeSection.style.display = 'none';
            } else {
                tripCodeSection.style.display = 'block';
                // Generate new code when switching to private
                this.generateTripCode('modalGeneratedTripCode');
            }
        });
        
        // Handle regenerate code button
        document.getElementById('modalRegenerateTripCode').addEventListener('click', () => {
            this.generateTripCode('modalGeneratedTripCode');
        });
        
        // Handle form submission
        document.getElementById('modalCreateTripForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleModalCreateTrip(e);
        });
        
        // Focus first input and initialize Places autocomplete
        setTimeout(() => {
            document.getElementById('modalTripTitle').focus();
            // Initialize Places autocomplete for the modal
            this.initPlacesAutocomplete();
        }, 100);
    }

    showJoinTripModal() {
        const modalContent = `
            <div class="space-y-6">
                <div class="text-center mb-6">
                    <span class="material-icons text-4xl mb-3 block" style="color: var(--ios-blue);">search</span>
                    <p class="text-gray-600">Enter a trip code or search for public trips to join</p>
                </div>
                
                <div class="form-group">
                    <label for="modalTripCode">Trip Code</label>
                    <div class="flex gap-3">
                        <input type="text" id="modalTripCode" placeholder="Enter trip code (e.g., CAMP2024)"
                               class="flex-1 form-input">
                        <button id="modalJoinByCodeBtn" class="ios-button-primary">
                            Join
                        </button>
                    </div>
                    <small class="text-gray-500">Ask the trip organizer for the trip code</small>
                </div>
                
                <div class="text-center">
                    <div class="text-gray-400 mb-4">or</div>
                    <button id="modalSearchTripsBtn" class="ios-button-secondary w-full">
                        <span class="material-icons mr-2" style="font-size: 16px;">public</span>
                        Browse Public Trips
                    </button>
                </div>
            </div>
        `;
        
        this.showModal('Join a Trip', modalContent);
        
        // Handle join by code
        document.getElementById('modalJoinByCodeBtn').addEventListener('click', () => {
            this.handleModalJoinByCode();
        });
        
        // Handle enter key in trip code input
        document.getElementById('modalTripCode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('modalJoinByCodeBtn').click();
            }
        });
        
        // Handle browse public trips
        document.getElementById('modalSearchTripsBtn').addEventListener('click', () => {
            this.closeModal();
            this.showBrowseTripsView();
        });
        
        // Focus the trip code input
        setTimeout(() => {
            document.getElementById('modalTripCode').focus();
        }, 100);
    }

    async handleModalJoinByCode() {
        const tripCode = document.getElementById('modalTripCode').value.trim();
        if (!tripCode) {
            this.showMessage('Please enter a trip code', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/trips/join-by-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ tripCode })
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage(`Successfully joined "${data.trip.title}"!`, 'success');
                this.closeModal();
                // Refresh user's trips and dashboard data
                setTimeout(() => {
                    this.loadMyTrips();
                    this.loadDashboardData();
                }, 1000);
            } else {
                if (data.errors) {
                    const errorMessages = data.errors.map(err => err.msg).join(', ');
                    this.showMessage(errorMessages, 'error');
                } else {
                    this.showMessage(data.error || 'Failed to join trip', 'error');
                }
            }
        } catch (error) {
            console.error('Error joining trip:', error);
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    async handleModalCreateTrip(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const isPublic = formData.has('isPublic');
        const tripCode = isPublic ? null : document.getElementById('modalGeneratedTripCode').textContent;
        const location = formData.get('location');
        
        // Get coordinates from Google Places if available, otherwise geocode
        const locationInput = document.getElementById('modalTripLocation');
        let coordinates = null;
        
        if (locationInput.dataset.lat && locationInput.dataset.lng) {
            // Use coordinates from Google Places
            coordinates = {
                lat: parseFloat(locationInput.dataset.lat),
                lon: parseFloat(locationInput.dataset.lng)
            };
            console.log('Using Google Places coordinates:', coordinates);
        } else {
            // Fallback to geocoding
            coordinates = await this.geocodeLocation(location);
            console.log('Using geocoded coordinates:', coordinates);
        }
        
        const tripData = {
            title: formData.get('title'),
            location: location,
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            tripType: formData.get('tripType'),
            description: formData.get('description'),
            isPublic: isPublic,
            tripCode: tripCode,
            latitude: coordinates ? coordinates.lat : null,
            longitude: coordinates ? coordinates.lon : null
        };

        try {
            const response = await fetch('/api/trips', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(tripData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage('Camping trip created successfully!', 'success');
                this.closeModal();
                this.loadMyTrips(); // Refresh the user's trips list
            } else {
                if (data.errors) {
                    const errorMessages = data.errors.map(err => err.msg).join(', ');
                    this.showMessage(errorMessages, 'error');
                } else {
                    this.showMessage(data.error || 'Failed to create trip', 'error');
                }
            }
        } catch (error) {
            console.error('Error creating trip:', error);
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    async showAddTaskModal(tripId) {
        // First get trip participants for assignment dropdown
        try {
            const response = await fetch(`/api/trips/${tripId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                this.showMessage('Failed to load trip details', 'error');
                return;
            }

            const data = await response.json();
            const trip = data.trip;
            const participants = data.participants || [];

            const modalContent = `
                <form id="modalAddTaskForm" class="modal-form">
                    <div class="form-group">
                        <label for="modalTaskTitle">Task Title *</label>
                        <input type="text" id="modalTaskTitle" name="title" required 
                               placeholder="Enter task title">
                    </div>
                    
                    <div class="form-group">
                        <label for="modalTaskDescription">Description</label>
                        <textarea id="modalTaskDescription" name="description" rows="3"
                                  placeholder="Describe what needs to be done"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="modalTaskAssignment">Assign To *</label>
                        <select id="modalTaskAssignment" name="assignedTo" required>
                            <option value="everyone">Everyone</option>
                            <option value="anyone" selected>Anyone</option>
                            ${participants.map(p => `
                                <option value="${p.user_id}">${p.first_name} ${p.last_name}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <div class="flex items-center gap-3">
                            <label class="ios-switch">
                                <input type="checkbox" id="modalHasDueDate">
                                <span class="ios-switch-slider"></span>
                            </label>
                            <span style="font-size: 16px; color: #1D1D1F;">Set due date</span>
                        </div>
                    </div>
                    
                    <div id="modalDueDateSection" class="grid grid-cols-1 md:grid-cols-2 gap-4" style="display: none;">
                        <div class="form-group">
                            <label for="modalDueDate">Due Date</label>
                            <input type="date" id="modalDueDate" name="dueDate">
                        </div>
                        <div class="form-group">
                            <label for="modalDueTime">Due Time</label>
                            <input type="time" id="modalDueTime" name="dueTime">
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="submit" class="ios-button-primary flex-1">
                            <span class="material-icons mr-2" style="font-size: 16px;">add</span>Create Task
                        </button>
                        <button type="button" onclick="app.closeModal()" class="ios-button-secondary">
                            Cancel
                        </button>
                    </div>
                </form>
            `;
            
            this.showModal('Add New Task', modalContent);
            
            // Handle due date toggle
            const hasDueDateCheckbox = document.getElementById('modalHasDueDate');
            const dueDateSection = document.getElementById('modalDueDateSection');
            
            hasDueDateCheckbox.addEventListener('change', () => {
                dueDateSection.style.display = hasDueDateCheckbox.checked ? 'grid' : 'none';
            });
            
            // Handle form submission
            document.getElementById('modalAddTaskForm').addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleModalAddTask(e, tripId);
            });
            
            // Focus first input
            setTimeout(() => {
                document.getElementById('modalTaskTitle').focus();
            }, 100);
            
        } catch (error) {
            console.error('Error loading trip for task form:', error);
            this.showMessage('Network error loading trip', 'error');
        }
    }

    async handleModalAddTask(e, tripId) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const hasDueDate = document.getElementById('modalHasDueDate').checked;
        
        const assignedToValue = formData.get('assignedTo');
        let assignmentType, assignedTo;
        
        if (assignedToValue === 'everyone' || assignedToValue === 'anyone') {
            assignmentType = assignedToValue;
            assignedTo = null;
        } else {
            assignmentType = 'specific';
            assignedTo = assignedToValue;
        }
        
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            assignmentType: assignmentType,
            assignedTo: assignedTo,
            hasDueDate: hasDueDate
        };
        
        if (hasDueDate) {
            const dueDate = formData.get('dueDate');
            const dueTime = formData.get('dueTime');
            if (dueDate) {
                taskData.dueDate = dueTime ? `${dueDate}T${dueTime}` : `${dueDate}T23:59`;
            }
        }

        try {
            const response = await fetch(`/api/tasks/trip/${tripId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(taskData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage('Task created successfully!', 'success');
                this.closeModal();
                this.loadTripTasks(tripId);
                this.loadDashboardTasks(); // Refresh dashboard
            } else {
                if (data.errors) {
                    const errorMessages = data.errors.map(err => err.msg).join(', ');
                    this.showMessage(errorMessages, 'error');
                } else {
                    this.showMessage(data.error || 'Failed to create task', 'error');
                }
            }
        } catch (error) {
            console.error('Error creating task:', error);
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    async showAddShoppingModal(tripId, editItem = null) {
        // Get shopping categories, dietary restrictions, and trip data
        const isEdit = editItem !== null;
        try {
            const [categoriesResponse, shoppingResponse, tripResponse] = await Promise.all([
                fetch('/api/shopping/categories', { credentials: 'include' }),
                fetch(`/api/shopping/trip/${tripId}`, { credentials: 'include' }),
                fetch(`/api/trips/${tripId}`, { credentials: 'include' })
            ]);

            let categories = [];
            let dietaryRestrictions = [];
            let trip = null;
            
            if (categoriesResponse.ok) {
                const data = await categoriesResponse.json();
                categories = data.categories || [];
            }
            
            if (shoppingResponse.ok) {
                const data = await shoppingResponse.json();
                dietaryRestrictions = data.dietary_restrictions || [];
            }
            
            if (tripResponse.ok) {
                trip = await tripResponse.json();
            }

            // Create dietary restrictions info for modal
            let dietaryInfo = '';
            if (dietaryRestrictions && dietaryRestrictions.length > 0) {
                const restrictionsList = dietaryRestrictions.map(person => 
                    `<span class="inline-block px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 mr-1 mb-1">
                        ${person.first_name}: ${person.dietary_restrictions}
                    </span>`
                ).join('');
                
                dietaryInfo = `
                    <div class="mb-4 p-3 rounded-lg" style="background: #FFF3E0; border: 1px solid #FF9500;">
                        <div class="flex items-center mb-2">
                            <span class="material-icons mr-2 text-orange-600" style="font-size: 16px;">restaurant_menu</span>
                            <span class="text-sm font-medium text-orange-800">Consider Dietary Restrictions</span>
                        </div>
                        <div class="flex flex-wrap">
                            ${restrictionsList}
                        </div>
                    </div>
                `;
            }

            const modalContent = `
                ${dietaryInfo}
                <form id="modalAddShoppingForm" class="modal-form">
                    <div class="form-group">
                        <label for="modalItemName">Item Name *</label>
                        <input type="text" id="modalItemName" name="itemName" required 
                               placeholder="Enter item name" value="${isEdit ? editItem.item_name || '' : ''}">
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="form-group">
                            <label for="modalItemCategory">Category</label>
                            <select id="modalItemCategory" name="category">
                                ${categories.map(cat => `
                                    <option value="${cat.name}" ${isEdit && editItem.category === cat.name ? 'selected' : ''}>${cat.name}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="modalItemQuantity">Quantity</label>
                            <input type="number" id="modalItemQuantity" name="quantity" 
                                   min="1" value="${isEdit ? editItem.quantity || 1 : 1}" placeholder="1">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="block text-sm font-medium mb-3" style="color: var(--text-primary)">Who should buy this item? *</label>
                        <div class="space-y-2">
                            <div class="flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50" 
                                 style="background: var(--bg-secondary); border-color: var(--border-primary);"
                                 onclick="this.querySelector('input').click()">
                                <input type="radio" name="assignmentType" value="me" ${(!isEdit || editItem.assigned_to === 'me') ? 'checked' : ''}
                                       class="h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 mr-3"
                                       style="accent-color: var(--ios-blue);">
                                <div>
                                    <div class="font-medium" style="color: var(--text-primary);">For me</div>
                                    <div class="text-sm" style="color: var(--text-secondary);">I'll buy this item</div>
                                </div>
                            </div>
                            
                            <div class="flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50" 
                                 style="background: var(--bg-secondary); border-color: var(--border-primary);"
                                 onclick="this.querySelector('input').click()">
                                <input type="radio" name="assignmentType" value="everyone" ${(isEdit && editItem.assigned_to === 'everyone') ? 'checked' : ''}
                                       class="h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 mr-3"
                                       style="accent-color: var(--ios-blue);">
                                <div>
                                    <div class="font-medium" style="color: var(--text-primary);">For everyone</div>
                                    <div class="text-sm" style="color: var(--text-secondary);">Everyone should buy this item</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Hidden fields for removed features with default values -->
                    <input type="hidden" name="description" value="">
                    <input type="hidden" name="estimatedCost" value="">
                    <input type="hidden" name="priority" value="medium">
                    <input type="hidden" name="notes" value="">
                    
                    <div class="modal-actions">
                        <button type="submit" class="ios-button-primary flex-1">
                            <span class="material-icons mr-2" style="font-size: 16px;">${isEdit ? 'save' : 'add_shopping_cart'}</span>${isEdit ? 'Update Item' : 'Add Item'}
                        </button>
                        <button type="button" onclick="app.closeModal()" class="ios-button-secondary">
                            Cancel
                        </button>
                    </div>
                </form>
            `;
            
            this.showModal(isEdit ? 'Edit Shopping Item' : 'Add Shopping Item', modalContent);
            
            // Handle assignment type changes for shopping items
            const shoppingAssignmentRadios = document.querySelectorAll('input[name="assignmentType"]');
            shoppingAssignmentRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    // Update visual states for all radio containers
                    const radioContainers = document.querySelectorAll('.space-y-2 > div');
                    radioContainers.forEach(container => {
                        const radioInput = container.querySelector('input[type="radio"]');
                        if (radioInput && radioInput.checked) {
                            container.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                            container.style.borderColor = 'var(--ios-blue)';
                        } else {
                            container.style.backgroundColor = 'var(--bg-secondary)';
                            container.style.borderColor = 'var(--border-primary)';
                        }
                    });
                });
            });

            // Handle form submission
            document.getElementById('modalAddShoppingForm').addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleModalAddShopping(e, tripId, isEdit, isEdit ? editItem.id : null);
            });
            
            // Focus first input
            setTimeout(() => {
                document.getElementById('modalItemName').focus();
            }, 100);
            
        } catch (error) {
            console.error('Error loading categories for shopping form:', error);
            this.showMessage('Network error loading categories', 'error');
        }
    }

    async editShoppingItem(itemId) {
        try {
            // First, get the current item data
            const response = await fetch(`/api/shopping/trip/${this.getCurrentTripId()}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                this.showMessage('Failed to load shopping items', 'error');
                return;
            }

            const data = await response.json();
            const item = data.items.find(i => i.id === itemId);

            if (!item) {
                this.showMessage('Shopping item not found', 'error');
                return;
            }

            // Show the shopping modal with item data pre-filled
            await this.showAddShoppingModal(this.getCurrentTripId(), item);
        } catch (error) {
            console.error('Error loading shopping item for edit:', error);
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    async handleModalAddShopping(e, tripId, isEdit = false, itemId = null) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const assignmentType = formData.get('assignmentType');
        
        const shoppingData = {
            item_name: formData.get('itemName'),
            description: formData.get('description'),
            category: formData.get('category'),
            quantity: parseInt(formData.get('quantity')) || 1,
            estimated_cost: parseFloat(formData.get('estimatedCost')) || null,
            priority: formData.get('priority'),
            assigned_to: assignmentType === 'me' ? 'me' : assignmentType,
            notes: formData.get('notes')
        };

        try {
            const url = isEdit ? `/api/shopping/${itemId}` : `/api/shopping/trip/${tripId}`;
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(shoppingData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage(`Shopping item ${isEdit ? 'updated' : 'added'} successfully!`, 'success');
                this.closeModal();
                this.loadTripShopping(tripId);
                this.loadDashboardShopping(); // Refresh dashboard
            } else {
                if (data.errors) {
                    const errorMessages = data.errors.map(err => err.msg).join(', ');
                    this.showMessage(errorMessages, 'error');
                } else {
                    this.showMessage(data.error || `Failed to ${isEdit ? 'update' : 'add'} shopping item`, 'error');
                }
            }
        } catch (error) {
            console.error(`Error ${isEdit ? 'updating' : 'adding'} shopping item:`, error);
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage('Welcome back!', 'success');
                // Add small delay to ensure cookie is properly set
                setTimeout(() => {
                    this.showDashboard(data.user);
                }, 200);
            } else {
                this.showMessage(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const firstName = document.getElementById('registerFirstName').value;
        const lastName = document.getElementById('registerLastName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        // Get optional profile fields
        const bio = document.getElementById('registerBio').value.trim();
        const camperType = document.getElementById('registerCamperType').value;
        const groupSize = parseInt(document.getElementById('registerGroupSize').value) || 1;
        const dietaryRestrictions = document.getElementById('registerDietary').value;
        const phone = document.getElementById('registerPhone').value.trim();
        
        const registrationData = {
            firstName,
            lastName,
            email,
            password,
            // Include profile fields if they have values
            bio: bio || null,
            camperType: camperType || null,
            groupSize,
            dietaryRestrictions: dietaryRestrictions || null,
            phone: phone || null
        };
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(registrationData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage('Account created successfully!', 'success');
                this.showDashboard(data.user);
            } else {
                if (data.errors) {
                    const errorMessages = data.errors.map(err => err.msg).join(', ');
                    this.showMessage(errorMessages, 'error');
                } else {
                    this.showMessage(data.error || 'Registration failed', 'error');
                }
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    async handleLogout() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                this.showMessage('Logged out successfully!', 'success');
                
                // Clear user data
                this.currentUser = null;
                
                // Small delay to show success message, then redirect
                setTimeout(() => {
                    // Redirect to landing page or refresh to show auth forms
                    if (window.location.pathname === '/app') {
                        window.location.href = '/';
                    } else {
                        window.location.reload();
                    }
                }, 1000);
            } else {
                this.showMessage('Logout failed', 'error');
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.showDashboard(data.user);
            } else {
                this.showAuthForms();
            }
        } catch (error) {
            console.error('Auth check error:', error);
            this.showAuthForms();
        }
    }

    showMessage(message, type = 'info') {
        this.showNotification(message, type);
    }

    copyTripCode(tripCode) {
        if (navigator.clipboard && window.isSecureContext) {
            // Use modern clipboard API
            navigator.clipboard.writeText(tripCode).then(() => {
                this.showMessage('Trip code copied to clipboard!', 'success');
            }).catch(err => {
                console.error('Failed to copy trip code:', err);
                this.fallbackCopyTripCode(tripCode);
            });
        } else {
            // Fallback for older browsers or non-secure contexts
            this.fallbackCopyTripCode(tripCode);
        }
    }

    fallbackCopyTripCode(tripCode) {
        // Create a temporary textarea element
        const textArea = document.createElement('textarea');
        textArea.value = tripCode;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showMessage('Trip code copied to clipboard!', 'success');
        } catch (err) {
            console.error('Fallback copy failed:', err);
            this.showMessage('Failed to copy trip code. Please copy manually: ' + tripCode, 'error');
        } finally {
            document.body.removeChild(textArea);
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        const notificationContainer = document.getElementById('notificationContainer');
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Get appropriate icon
        const icons = {
            success: 'check_circle',
            error: 'error',
            info: 'info',
            warning: 'warning'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="material-icons notification-icon">${icons[type] || icons.info}</span>
                <div class="notification-text">${message}</div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <span class="material-icons">close</span>
                </button>
            </div>
        `;
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.classList.remove('show');
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.remove();
                        }
                    }, 400);
                }
            }, duration);
        }
        
        // Scroll to top to ensure visibility
        this.scrollToTop();
    }

    clearMessages() {
        const notificationContainer = document.getElementById('notificationContainer');
        if (notificationContainer) {
            notificationContainer.innerHTML = '';
        }
        // Also clear legacy container
        if (this.messageContainer) {
            this.messageContainer.innerHTML = '';
        }
    }

    clearForms() {
        document.getElementById('loginFormElement').reset();
        document.getElementById('registerFormElement').reset();
    }

    // Google Maps Route Integration
    async openGoogleMapsRoute(destination, tripTitle) {
        try {
            // Get user's address from profile
            const userAddress = this.currentUser?.address;
            
            if (userAddress && userAddress !== 'Not specified') {
                // Build route URL with user's address as origin
                const origin = encodeURIComponent(userAddress);
                const dest = encodeURIComponent(destination);
                const googleMapsUrl = `https://www.google.com/maps/dir/${origin}/${dest}`;
                
                window.open(googleMapsUrl, '_blank');
            } else {
                // Fallback: Just open destination in Google Maps
                const dest = encodeURIComponent(destination);
                const googleMapsUrl = `https://www.google.com/maps/search/${dest}`;
                window.open(googleMapsUrl, '_blank');
                
                // Show message about adding address for directions
                this.showMessage('Add your address in profile settings to get personalized directions!', 'info');
            }
        } catch (error) {
            console.error('Error opening Google Maps:', error);
            this.showNotification('Unable to open directions', 'error');
        }
    }

    async calculateTravelTime(origin, destination, tripTitle) {
        // This would typically use Google Maps API, but for now we'll show a placeholder
        // In a production app, you'd want to use the Google Maps Distance Matrix API
        const travelTimeElement = document.querySelector(`[id*="travelTimeCallout"]`);
        if (travelTimeElement) {
            travelTimeElement.innerHTML = `
                <span class="material-icons mr-1" style="font-size: 16px;">schedule</span>
                <span class="text-sm">Route opened in Maps</span>
            `;
        }
    }

    // Utility method to scroll to top smoothly
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // Map functionality
    async geocodeLocation(location) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`);
            const results = await response.json();
            
            if (results && results.length > 0) {
                return {
                    lat: parseFloat(results[0].lat),
                    lon: parseFloat(results[0].lon),
                    display_name: results[0].display_name
                };
            }
            return null;
        } catch (error) {
            console.log('Geocoding error:', error);
            return null;
        }
    }

    createMiniMap(containerId, lat, lon, location) {
        try {
            const container = document.getElementById(containerId);
            if (!container) return null;

            // Check if map already exists and is valid
            if (container._leaflet_id) {
                try {
                    // Map already exists, just update it
                    const existingMap = container._leaflet_map;
                    if (existingMap) {
                        existingMap.setView([lat, lon], 10);
                        return existingMap;
                    }
                } catch (e) {
                    // Map exists but is broken, remove it
                    container._leaflet_id = undefined;
                    container.innerHTML = '';
                }
            }

            // Create new map with stable container
            const mapDiv = document.createElement('div');
            mapDiv.style.height = '100%';
            mapDiv.style.width = '100%';
            mapDiv.style.minHeight = '200px';
            container.innerHTML = '';
            container.appendChild(mapDiv);
            
            const map = L.map(mapDiv, {
                center: [lat, lon],
                zoom: 10,
                zoomControl: false,
                dragging: false,
                touchZoom: false,
                doubleClickZoom: false,
                scrollWheelZoom: false,
                boxZoom: false,
                keyboard: false,
                attributionControl: false
            });

            // Store reference to prevent recreation
            container._leaflet_map = map;

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: ''
            }).addTo(map);

            // Add marker
            L.marker([lat, lon]).addTo(map)
                .bindPopup(location);

            // Force map to resize after a short delay
            setTimeout(() => {
                if (map) {
                    map.invalidateSize();
                }
            }, 100);

            return map;
        } catch (error) {
            console.log('Map creation error:', error);
            return null;
        }
    }

    createFullMap(containerId, lat, lon, location) {
        try {
            const container = document.getElementById(containerId);
            if (!container) return null;

            // Check if map already exists and is valid
            if (container._leaflet_id) {
                try {
                    const existingMap = container._leaflet_map;
                    if (existingMap) {
                        existingMap.setView([lat, lon], 12);
                        return existingMap;
                    }
                } catch (e) {
                    container._leaflet_id = undefined;
                    container.innerHTML = '';
                }
            }

            // Create stable map container
            const mapDiv = document.createElement('div');
            mapDiv.style.height = '100%';
            mapDiv.style.width = '100%';
            mapDiv.style.minHeight = '300px';
            mapDiv.style.position = 'relative';
            container.innerHTML = '';
            container.appendChild(mapDiv);
            
            const map = L.map(mapDiv, {
                center: [lat, lon],
                zoom: 12,
                zoomControl: true,
                attributionControl: true
            });

            // Store reference
            container._leaflet_map = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            L.marker([lat, lon]).addTo(map)
                .bindPopup(`<b>${location}</b>`)
                .openPopup();

            // Force resize after delay and ensure controls are visible
            setTimeout(() => {
                if (map) {
                    map.invalidateSize();
                    // Force controls to be visible
                    const zoomControl = container.querySelector('.leaflet-control-zoom');
                    if (zoomControl) {
                        zoomControl.style.visibility = 'visible';
                        zoomControl.style.display = 'block';
                        zoomControl.style.opacity = '1';
                    }
                }
            }, 100);

            return map;
        } catch (error) {
            console.log('Full map creation error:', error);
            return null;
        }
    }

    getUserFullAddress() {
        if (!this.currentUser) return null;
        
        // Build full address from user profile fields
        const addressParts = [];
        
        if (this.currentUser.home_address) {
            addressParts.push(this.currentUser.home_address);
        }
        
        if (this.currentUser.home_city) {
            let cityLine = this.currentUser.home_city;
            if (this.currentUser.home_state) {
                cityLine += `, ${this.currentUser.home_state}`;
            }
            if (this.currentUser.home_zip) {
                cityLine += ` ${this.currentUser.home_zip}`;
            }
            addressParts.push(cityLine);
        }
        
        return addressParts.length > 0 ? addressParts.join(', ') : null;
    }

    findDirectionsButton() {
        // Find the directions button - try multiple selectors
        let directionsBtn = document.getElementById('directionsButton');
        if (!directionsBtn) {
            directionsBtn = document.querySelector('button[onclick*="google.com/maps"]');
        }
        if (!directionsBtn) {
            directionsBtn = document.querySelector('button[onclick*="maps/search"]');
        }
        if (!directionsBtn) {
            // Look for button containing "Get Directions" text
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                if (btn.textContent.includes('Get Directions') || btn.textContent.includes('directions')) {
                    directionsBtn = btn;
                    break;
                }
            }
        }
        // Reduced logging - only log if button not found
        if (!directionsBtn) {
            console.log('🔍 Button search failed:', {
                byId: !!document.getElementById('directionsButton'),
                byOnclick: !!document.querySelector('button[onclick*="google.com/maps"]'),
                byText: !!Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Get Directions'))
            });
        }
        return directionsBtn;
    }

    // Debug function - call this from console: app.debugDirections()
    debugDirections() {
        console.log('🔧 DEBUGGING DIRECTIONS BUTTON');
        console.log('📍 Current user:', this.currentUser);
        console.log('🏠 User address:', this.getUserFullAddress());
        
        const directionsBtn = this.findDirectionsButton();
        console.log('🔍 Found directions button:', directionsBtn);
        
        if (directionsBtn) {
            console.log('📝 Button HTML:', directionsBtn.outerHTML);
            console.log('📝 Button text:', directionsBtn.textContent);
        }
        
        // Try to manually update the button
        if (directionsBtn) {
            directionsBtn.innerHTML = `
                <span class="material-icons mr-2">directions</span>
                TEST - 25 mi - 1h 30m
            `;
            console.log('✅ Manually updated button for testing');
        }
        
        return {
            user: this.currentUser,
            address: this.getUserFullAddress(),
            button: directionsBtn
        };
    }

    async updateDirectionsButton(trip) {
        try {
            console.log('🗺️ Updating directions button for trip:', trip.title);
            
            // Check if user has a valid address
            const userAddress = this.getUserFullAddress();
            console.log('📍 User address:', userAddress);
            
            if (!userAddress) {
                console.log('⚠️ No user address found, will show basic directions button');
                // Still try to update button with basic functionality
                const directionsBtn = this.findDirectionsButton();
                if (directionsBtn) {
                    directionsBtn.innerHTML = `
                        <span class="material-icons mr-2">directions</span>Get Directions
                    `;
                    console.log('ℹ️ Updated button to basic "Get Directions"');
                }
                return;
            }
            
            const tripLocation = trip.location;
            console.log('🎯 Trip location:', tripLocation);

            // Calculate distance and drive time
            console.log('🔄 Calculating route info...');
            const routeInfo = await this.calculateRouteInfo(userAddress, tripLocation);
            console.log('📊 Route info:', routeInfo);
            
            if (routeInfo) {
                const directionsBtn = this.findDirectionsButton();
                console.log('🔍 Found directions button:', !!directionsBtn);
                
                if (directionsBtn) {
                    const { distance, duration } = routeInfo;
                    console.log(`✅ Updating button with: ${distance} - ${duration}`);
                    
                    directionsBtn.innerHTML = `
                        <span class="material-icons mr-2">directions</span>
                        ${distance} - ${duration}
                    `;
                    
                    // Update onclick to include both addresses for better directions
                    const encodedOrigin = encodeURIComponent(userAddress);
                    const encodedDestination = encodeURIComponent(tripLocation);
                    directionsBtn.onclick = () => {
                        window.open(`https://www.google.com/maps/dir/${encodedOrigin}/${encodedDestination}`, '_blank');
                    };
                    
                    console.log('🎉 Directions button updated successfully!');
                } else {
                    console.log('❌ Could not find directions button to update');
                }

                // Optionally show route on map
                await this.showRouteOnMap(trip, userAddress, tripLocation);
            } else {
                console.log('❌ Could not calculate route info');
            }
        } catch (error) {
            console.error('❌ Error updating directions button:', error);
            // Keep default button if there's an error
        }
    }

    async calculateRouteInfo(origin, destination) {
        try {
            // Use a routing service to get distance and time
            // For now, we'll use a simple distance calculation and estimate
            const originCoords = await this.geocodeLocation(origin);
            const destCoords = await this.geocodeLocation(destination);
            
            if (!originCoords || !destCoords) {
                return null;
            }

            // Calculate straight-line distance
            const distance = this.calculateDistance(
                originCoords.lat, originCoords.lon,
                destCoords.lat, destCoords.lon
            );

            // Estimate driving time (assuming average 45 mph with traffic/roads)
            const estimatedDriveTimeHours = distance / 45;
            const hours = Math.floor(estimatedDriveTimeHours);
            const minutes = Math.round((estimatedDriveTimeHours - hours) * 60);

            let durationText;
            if (hours > 0) {
                durationText = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
            } else {
                durationText = `${minutes}m`;
            }

            return {
                distance: `${Math.round(distance)} mi`,
                duration: durationText,
                originCoords,
                destCoords
            };
        } catch (error) {
            console.error('Error calculating route info:', error);
            return null;
        }
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        // Haversine formula to calculate distance between two points
        const R = 3959; // Earth's radius in miles
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRadians(degrees) {
        return degrees * (Math.PI/180);
    }

    async showRouteOnMap(trip, userAddress, tripLocation) {
        try {
            const mapContainer = document.getElementById('trip-detail-map');
            const map = mapContainer?._leaflet_map;
            
            if (!map) return;

            const originCoords = await this.geocodeLocation(userAddress);
            const destCoords = await this.geocodeLocation(tripLocation);
            
            if (!originCoords || !destCoords) return;

            // Add origin marker (user's location)
            const originMarker = L.marker([originCoords.lat, originCoords.lon], {
                icon: L.divIcon({
                    className: 'custom-marker origin-marker',
                    html: '<div style="background: #007AFF; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">A</div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(map);
            
            originMarker.bindPopup(`<b>Your Location</b><br>${userAddress}`);

            // Update destination marker
            const destMarker = L.marker([destCoords.lat, destCoords.lon], {
                icon: L.divIcon({
                    className: 'custom-marker dest-marker',
                    html: '<div style="background: #34C759; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">B</div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(map);
            
            destMarker.bindPopup(`<b>${trip.title}</b><br>${tripLocation}`);

            // Draw a simple line between points (for a more accurate route, you'd use a routing service)
            const routeLine = L.polyline([
                [originCoords.lat, originCoords.lon],
                [destCoords.lat, destCoords.lon]
            ], {
                color: '#007AFF',
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 10'
            }).addTo(map);

            // Fit map to show both points
            const group = new L.featureGroup([originMarker, destMarker, routeLine]);
            map.fitBounds(group.getBounds().pad(0.1));

        } catch (error) {
            console.error('Error showing route on map:', error);
        }
    }

    // Dashboard Navigation Methods
    showMyTripsView() {
        // Hide profile container
        const profileContainer = document.getElementById('simpleProfileContainer');
        if (profileContainer) profileContainer.style.display = 'none';
        
        // Show dashboard
        document.getElementById('dashboardContainer').style.display = 'block';
        document.getElementById('myTripsContainer').classList.remove('hidden');
        document.getElementById('allTripsContainer').classList.add('hidden');
        document.getElementById('createTripSection').classList.add('hidden');
        
        // Make sure trip details section is completely hidden
        const detailsSection = document.getElementById('tripDetailsSection');
        if (detailsSection) {
            detailsSection.classList.add('hidden');
            detailsSection.style.display = 'none';
        }
        
        // Show dashboard content when returning from trip details
        const dashboardHeader = document.querySelector('#dashboard > .mb-8');
        if (dashboardHeader) {
            dashboardHeader.style.display = 'block';
        }
        
        const dashboardGrid = document.querySelector('#dashboard > .grid.grid-cols-1.lg\\:grid-cols-3');
        if (dashboardGrid) {
            dashboardGrid.style.display = 'grid';
        }
        
        const joinSection = document.getElementById('joinTripSection');
        if (joinSection) joinSection.classList.add('hidden');
        
        this.loadMyTrips();
    }

    showBrowseTripsView() {
        document.getElementById('myTripsContainer').classList.add('hidden');
        document.getElementById('allTripsContainer').classList.remove('hidden');
        document.getElementById('createTripSection').classList.add('hidden');
        
        // Make sure trip details section is completely hidden
        const detailsSection = document.getElementById('tripDetailsSection');
        if (detailsSection) {
            detailsSection.classList.add('hidden');
            detailsSection.style.display = 'none';
        }
        
        // Show dashboard title and main action buttons when returning to dashboard
        const dashboardTitle = document.getElementById('dashboardTitle');
        if (dashboardTitle) {
            dashboardTitle.style.display = 'block';
        }
        
        const mainActionButtons = document.getElementById('mainActionButtons');
        if (mainActionButtons) {
            mainActionButtons.style.display = 'grid';
        }
        
        const joinSection = document.getElementById('joinTripSection');
        if (joinSection) joinSection.classList.add('hidden');
        
        this.loadAllTrips();
    }

    showJoinTripsView() {
        // Hide other sections and show join trip interface
        document.getElementById('myTripsContainer').classList.add('hidden');
        document.getElementById('allTripsContainer').classList.add('hidden');
        document.getElementById('createTripSection').classList.add('hidden');
        
        // Create or show join trip section
        let joinSection = document.getElementById('joinTripSection');
        if (!joinSection) {
            joinSection = document.createElement('div');
            joinSection.id = 'joinTripSection';
            joinSection.className = 'mt-8';
            joinSection.innerHTML = `
                <div class="apple-card p-8 max-w-2xl mx-auto">
                    <div class="text-center mb-8">
                        <span class="material-icons text-4xl text-blue-600 mb-4 block">search</span>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Join a Trip</h3>
                        <p class="text-gray-600">Enter a trip code or search for trips to join</p>
                    </div>
                    
                    <div class="space-y-6">
                        <div>
                            <label for="tripCode" class="block text-sm font-medium text-gray-700 mb-2">Trip Code</label>
                            <div class="flex gap-3">
                                <input type="text" id="tripCode" placeholder="Enter trip code (e.g., CAMP2024)"
                                       class="flex-1 form-input">
                                <button id="joinByCodeBtn" class="ios-button-primary">
                                    Join
                                </button>
                            </div>
                            <p class="text-xs text-gray-500 mt-1">Ask the trip organizer for the trip code</p>
                        </div>
                        
                        <div class="text-center">
                            <div class="text-gray-400 mb-4">or</div>
                            <button id="searchTripsBtn" class="text-blue-600 hover:text-blue-800 font-medium">
                                Search for public trips to join
                            </button>
                        </div>
                    </div>
                    
                    <div class="mt-8 pt-6 border-t">
                        <button id="backFromJoinBtn" class="text-gray-600 hover:text-gray-800 font-medium flex items-center">
                            <span class="material-icons text-sm mr-2">arrow_back</span>Back to Dashboard
                        </button>
                    </div>
                </div>
            `;
            document.getElementById('dashboard').appendChild(joinSection);
        }
        
        joinSection.classList.remove('hidden');
        
        // Scroll to top to show the form
        this.scrollToTop();
        
        // Add event listeners
        document.getElementById('backFromJoinBtn').addEventListener('click', () => {
            joinSection.classList.add('hidden');
            this.showMyTripsView();
        });
        
        document.getElementById('searchTripsBtn').addEventListener('click', () => {
            joinSection.classList.add('hidden');
            this.showBrowseTripsView();
        });
        
        document.getElementById('joinByCodeBtn').addEventListener('click', () => {
            this.handleJoinByCode();
        });
    }

    showCreateTripSection() {
        document.getElementById('createTripSection').classList.remove('hidden');
        document.getElementById('myTripsContainer').classList.add('hidden');
        document.getElementById('allTripsContainer').classList.add('hidden');
        
        // Scroll to top to show the form
        this.scrollToTop();
    }

    hideCreateTripSection() {
        document.getElementById('createTripSection').classList.add('hidden');
        document.getElementById('myTripsContainer').classList.remove('hidden');
        document.getElementById('allTripsContainer').classList.add('hidden');
        const detailsSection = document.getElementById('tripDetailsSection');
        if (detailsSection) detailsSection.classList.add('hidden');
        const joinSection = document.getElementById('joinTripSection');
        if (joinSection) joinSection.classList.add('hidden');
        document.getElementById('createTripForm').reset();
    }

    async showUserProfile(userId) {
        try {
            const response = await fetch(`/api/profile/${userId}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                const userName = `${data.user.first_name} ${data.user.last_name}`;
                
                // If it's the current user's profile, show edit option
                if (data.isOwnProfile) {
                    this.showOwnProfileModal(data.user, userName);
                } else {
                    this.showUserProfileModal(data.user, userName);
                }
            } else {
                this.showMessage('Failed to load profile', 'error');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showMessage('Error loading profile', 'error');
        }
    }

    showOwnProfileModal(profile, userName) {
        // Helper function to get full address
        const getFullAddress = () => {
            const parts = [
                profile.home_address,
                profile.home_city,
                profile.home_state,
                profile.home_zip
            ].filter(part => part && part.trim());
            return parts.length > 0 ? parts.join(', ') : null;
        };

        const modalContent = `
            <div class="max-w-lg mx-auto">
                <div class="text-center mb-6">
                    <div class="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style="background: var(--ios-blue); opacity: 0.2;">
                        <span class="material-icons" style="font-size: 40px; color: var(--ios-blue);">person</span>
                    </div>
                    <h3 class="text-xl font-semibold" style="color: var(--text-primary);">${userName}</h3>
                    <p class="text-sm" style="color: var(--text-secondary);">Member since ${new Date(profile.created_at).toLocaleDateString()}</p>
                </div>

                <div class="space-y-4">
                    <!-- Email -->
                    ${profile.email ? `
                        <div>
                            <h4 class="font-medium mb-2" style="color: var(--text-primary);">Email</h4>
                            <p class="text-sm" style="color: var(--text-secondary);">📧 ${profile.email}</p>
                        </div>
                    ` : ''}

                    <!-- Phone -->
                    ${profile.phone ? `
                        <div>
                            <h4 class="font-medium mb-2" style="color: var(--text-primary);">Phone</h4>
                            <p class="text-sm" style="color: var(--text-secondary);">📞 ${profile.phone}</p>
                        </div>
                    ` : ''}

                    <!-- Home Address -->
                    ${getFullAddress() ? `
                        <div>
                            <h4 class="font-medium mb-2" style="color: var(--text-primary);">Home Address</h4>
                            <p class="text-sm" style="color: var(--text-secondary);">🏠 ${getFullAddress()}</p>
                        </div>
                    ` : ''}

                    <!-- Bio -->
                    ${profile.bio ? `
                        <div>
                            <h4 class="font-medium mb-2" style="color: var(--text-primary);">About</h4>
                            <p class="text-sm" style="color: var(--text-secondary);">${profile.bio}</p>
                        </div>
                    ` : ''}

                    <!-- Camping Style -->
                    ${profile.camper_type ? `
                        <div>
                            <h4 class="font-medium mb-2" style="color: var(--text-primary);">Camping Style</h4>
                            <div class="inline-flex items-center px-3 py-1 rounded-full text-sm" style="background: var(--ios-blue); color: white;">
                                <span class="material-icons mr-1" style="font-size: 16px;">
                                    ${profile.camper_type === 'tent' ? 'nature' : 
                                      profile.camper_type === 'rv' || profile.camper_type === 'trailer' ? 'rv_hookup' : 
                                      profile.camper_type === 'cabin' ? 'cabin' : 
                                      profile.camper_type === 'glamping' ? 'hotel' : 'nature'}
                                </span>
                                ${profile.camper_type.charAt(0).toUpperCase() + profile.camper_type.slice(1).replace('_', ' ')} Camper
                            </div>
                        </div>
                    ` : ''}

                    <!-- Group Size -->
                    ${profile.group_size ? `
                        <div>
                            <h4 class="font-medium mb-2" style="color: var(--text-primary);">Typical Group Size</h4>
                            <p class="text-sm" style="color: var(--text-secondary);">👥 ${profile.group_size} ${profile.group_size === 1 ? 'person' : 'people'}</p>
                        </div>
                    ` : ''}

                    <!-- Dietary Restrictions -->
                    ${profile.dietary_restrictions ? `
                        <div>
                            <h4 class="font-medium mb-2" style="color: var(--text-primary);">Dietary Restrictions</h4>
                            <div class="flex flex-wrap gap-2">
                                <span class="inline-flex items-center px-2 py-1 rounded text-xs" style="background: var(--ios-orange); color: white;">
                                    🍽️ ${profile.dietary_restrictions.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="mt-6 pt-4 border-t">
                    <button onclick="app.showEditProfileModal();" class="ios-button-primary w-full">
                        <span class="material-icons mr-2" style="font-size: 16px;">edit</span>Edit Profile
                    </button>
                </div>
            </div>
        `;

        this.showModal('My Profile', modalContent);
    }
    
    displayProfile(user, isOwnProfile) {
        // Build profile sections with smart field visibility
        const personalFields = this.buildProfileSection([
            { key: 'bio', label: 'Bio', value: user.bio, icon: 'person' },
            { key: 'phone', label: 'Phone', value: user.phone, icon: 'phone', privateOnly: true },
            { key: 'address', label: 'Home Address', value: this.getAddressDisplay(user, true), icon: 'home', privateOnly: true, isHTML: true }
        ], isOwnProfile);

        const campingFields = this.buildProfileSection([
            { key: 'camper_type', label: 'Camper Type', value: this.getCamperTypeDisplay(user.camper_type), icon: 'outdoor_grill' },
            { key: 'group_size', label: 'Group Size', value: user.group_size ? `${user.group_size} ${user.group_size === 1 ? 'person' : 'people'}` : null, icon: 'group' },
            { key: 'dietary', label: 'Dietary Restrictions', value: this.getDietaryDisplay(user.dietary_restrictions), icon: 'restaurant' }
        ], isOwnProfile);

        const profileHTML = `
            <div class="max-w-4xl mx-auto p-6" style="background: var(--ios-grouped-background); min-height: 100vh;">
                <!-- Header -->
                <div class="ios-card mb-6">
                    <div class="p-6">
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center">
                                <div class="w-16 h-16 rounded-full flex items-center justify-center mr-4" style="background: var(--ios-blue);">
                                    <span class="material-icons text-white text-2xl">person</span>
                                </div>
                                <div>
                                    <h1 class="ios-title-1 mb-1">${user.first_name} ${user.last_name}</h1>
                                    <p class="ios-footnote text-gray-500">Member since ${new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                ${isOwnProfile ? `
                                <button onclick="app.showEditProfile()" class="ios-button-primary ios-button-compact">
                                    <span class="material-icons mr-1" style="font-size: 14px;">edit</span>Edit
                                </button>
                                ` : ''}
                                <button onclick="app.showMyTripsView()" class="ios-button-secondary ios-button-compact">
                                    <span class="material-icons mr-1" style="font-size: 14px;">arrow_back</span>Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Personal Information -->
                    ${personalFields ? `
                    <div class="ios-card">
                        <div class="p-6">
                            <h3 class="ios-title-3 mb-4 flex items-center">
                                <span class="material-icons mr-3 text-blue-600" style="font-size: 20px;">person</span>
                                Personal Information
                            </h3>
                            ${personalFields}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Camping Preferences -->
                    ${campingFields ? `
                    <div class="ios-card">
                        <div class="p-6">
                            <h3 class="ios-title-3 mb-4 flex items-center">
                                <span class="material-icons mr-3 text-green-600" style="font-size: 20px;">outdoor_grill</span>
                                Camping Preferences
                            </h3>
                            ${campingFields}
                        </div>
                    </div>
                    ` : ''}
                </div>

                ${!personalFields && !campingFields ? `
                <div class="ios-card">
                    <div class="p-8 text-center">
                        <span class="material-icons text-6xl text-gray-300 mb-4">person_outline</span>
                        <h3 class="ios-title-3 text-gray-500 mb-2">Profile Not Complete</h3>
                        <p class="ios-body text-gray-400 mb-4">
                            ${isOwnProfile ? 'Add some information about yourself to help other campers get to know you.' : 'This user hasn\'t added profile information yet.'}
                        </p>
                        ${isOwnProfile ? `
                        <button onclick="app.showEditProfile()" class="ios-button-primary">
                            <span class="material-icons mr-2">edit</span>Complete Profile
                        </button>
                        ` : ''}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
        // Hide dashboard and show profile
        document.getElementById('dashboardContainer').style.display = 'none';
        document.getElementById('authContainer').style.display = 'none';
        
        // Create or update profile container
        let profileContainer = document.getElementById('simpleProfileContainer');
        if (!profileContainer) {
            profileContainer = document.createElement('div');
            profileContainer.id = 'simpleProfileContainer';
            profileContainer.style.cssText = 'padding: 20px; background: var(--bg-dark); min-height: 100vh;';
            document.body.appendChild(profileContainer);
        }
        
        profileContainer.innerHTML = profileHTML;
        profileContainer.style.display = 'block';
        
        // Event handlers are now inline in the HTML
        
        this.currentProfileUser = user;
        this.isOwnProfile = isOwnProfile;
    }

    buildProfileSection(fields, isOwnProfile) {
        const visibleFields = fields.filter(field => {
            // Skip private fields if not own profile
            if (field.privateOnly && !isOwnProfile) return false;
            // Skip fields with no value
            if (!field.value || field.value === 'Not specified' || field.value === 'None specified' || field.value === 'No bio provided') return false;
            return true;
        });

        if (visibleFields.length === 0) return null;

        return visibleFields.map(field => `
            <div class="flex items-start py-3 border-b border-gray-100 last:border-b-0">
                <span class="material-icons mr-3 mt-1 text-gray-400" style="font-size: 18px;">${field.icon}</span>
                <div class="flex-1">
                    <div class="ios-footnote text-gray-500 mb-1">${field.label}</div>
                    <div class="ios-body text-gray-900">
                        ${field.isHTML ? field.value : `<span>${field.value}</span>`}
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    getCamperTypeDisplay(type) {
        const map = {
            tent: 'Tent Camping',
            trailer: 'Travel Trailer', 
            rv: 'RV/Motorhome',
            van: 'Van/Camper Van',
            fifth_wheel: '5th Wheel'
        };
        return type ? map[type] : 'Not specified';
    }
    
    getDietaryDisplay(dietary) {
        if (!dietary) return 'None specified';
        return dietary;
    }

    getAddressDisplay(user, compact = false) {
        if (!user.home_address && !user.home_city) {
            return compact ? null : '<p style="color: #111827;">Not provided</p>';
        }

        const addressParts = [];
        if (user.home_address) addressParts.push(user.home_address);
        if (user.home_city) {
            let cityLine = user.home_city;
            if (user.home_state) cityLine += `, ${user.home_state}`;
            if (user.home_zip) cityLine += ` ${user.home_zip}`;
            addressParts.push(cityLine);
        }
        if (user.home_country && user.home_country !== 'United States') {
            addressParts.push(user.home_country);
        }

        if (addressParts.length === 0) {
            return compact ? null : '<p style="color: #111827;">Not provided</p>';
        }

        const fullAddress = addressParts.join(compact ? ', ' : '<br>');
        
        // Create "Open in Maps" link if we have coordinates or a full address
        let mapsLink = '';
        if (user.home_latitude && user.home_longitude) {
            mapsLink = `https://maps.apple.com/?q=${user.home_latitude},${user.home_longitude}`;
        } else if (addressParts.length > 0) {
            const searchAddress = addressParts.join(', ').replace(/<br>/g, ', ');
            mapsLink = `https://maps.apple.com/?q=${encodeURIComponent(searchAddress)}`;
        }

        if (compact) {
            return `
                <div>
                    <div class="mb-2">${fullAddress}</div>
                    ${mapsLink ? `
                        <a href="${mapsLink}" target="_blank" 
                           class="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm">
                            <span class="material-icons mr-1" style="font-size: 14px;">map</span>
                            Open in Maps
                        </a>
                    ` : ''}
                </div>
            `;
        }

        return `
            <div style="color: #111827;">
                <p>${fullAddress}</p>
                ${mapsLink ? `
                    <a href="${mapsLink}" target="_blank" 
                       style="display: inline-flex; align-items: center; margin-top: 8px; color: #3b82f6; text-decoration: none; font-size: 14px;">
                        <span class="material-icons" style="font-size: 16px; margin-right: 4px;">map</span>
                        Open in Maps
                    </a>
                ` : ''}
            </div>
        `;
    }

    showEditProfile() {
        console.log('showEditProfile called - opening editable modal');
        
        // Simply show the edit profile modal
        this.showEditProfileModal();
    }

    showEditProfileModal(user = null) {
        // Use provided user or current user
        const profileUser = user || this.currentUser;
        
        if (!profileUser) {
            this.showMessage('Unable to load profile data', 'error');
            return;
        }

        const modalContent = `
            <form id="modalProfileForm" class="modal-form">
                <div class="space-y-6">
                    <!-- Personal Information Section -->
                    <div>
                        <h3 class="text-lg font-semibold flex items-center mb-4" style="color: var(--text-primary);">
                            <span class="material-icons mr-2" style="font-size: 20px;">person</span>
                            Personal Information
                        </h3>
                        
                        <div class="space-y-4">
                            <div class="grid grid-cols-2 gap-3">
                                <div class="form-group">
                                    <label for="modalFirstName">First Name *</label>
                                    <input type="text" id="modalFirstName" name="firstName" required 
                                           value="${profileUser.first_name || ''}" maxlength="100">
                                </div>
                                <div class="form-group">
                                    <label for="modalLastName">Last Name *</label>
                                    <input type="text" id="modalLastName" name="lastName" required 
                                           value="${profileUser.last_name || ''}" maxlength="100">
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="modalPhone">Phone</label>
                                <input type="tel" id="modalPhone" name="phone" 
                                       value="${profileUser.phone || ''}" placeholder="(555) 123-4567" maxlength="20">
                            </div>

                            <div class="form-group">
                                <label for="modalBio">Bio</label>
                                <textarea id="modalBio" name="bio" rows="3" maxlength="1000"
                                          placeholder="Tell other campers about yourself...">${profileUser.bio || ''}</textarea>
                            </div>

                            <!-- Address Fields -->
                            <div class="form-group">
                                <label for="modalHomeAddress">Home Address</label>
                                <input type="text" id="modalHomeAddress" name="homeAddress" 
                                       value="${profileUser.home_address || ''}" placeholder="123 Main Street" maxlength="200">
                            </div>

                            <div class="grid grid-cols-3 gap-3">
                                <div class="form-group">
                                    <label for="modalHomeCity">City</label>
                                    <input type="text" id="modalHomeCity" name="homeCity" 
                                           value="${profileUser.home_city || ''}" placeholder="City" maxlength="100">
                                </div>
                                <div class="form-group">
                                    <label for="modalHomeState">State</label>
                                    <input type="text" id="modalHomeState" name="homeState" 
                                           value="${profileUser.home_state || ''}" placeholder="CA" maxlength="50">
                                </div>
                                <div class="form-group">
                                    <label for="modalHomeZip">ZIP</label>
                                    <input type="text" id="modalHomeZip" name="homeZip" 
                                           value="${profileUser.home_zip || ''}" placeholder="12345" maxlength="20">
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Camping Preferences Section -->
                    <div>
                        <h3 class="text-lg font-semibold flex items-center mb-4" style="color: var(--text-primary);">
                            <span class="material-icons mr-2" style="font-size: 20px;">nature</span>
                            Camping Preferences
                        </h3>
                        
                        <div class="space-y-4">
                            <div class="form-group">
                                <label for="modalCamperType">Camping Style</label>
                                <select id="modalCamperType" name="camperType">
                                    <option value="">Select your style</option>
                                    <option value="tent" ${profileUser.camper_type === 'tent' ? 'selected' : ''}>Tent Camping</option>
                                    <option value="trailer" ${profileUser.camper_type === 'trailer' ? 'selected' : ''}>Travel Trailer</option>
                                    <option value="rv" ${profileUser.camper_type === 'rv' ? 'selected' : ''}>RV/Motorhome</option>
                                    <option value="cabin" ${profileUser.camper_type === 'cabin' ? 'selected' : ''}>Cabin</option>
                                    <option value="glamping" ${profileUser.camper_type === 'glamping' ? 'selected' : ''}>Glamping</option>
                                    <option value="backpacking" ${profileUser.camper_type === 'backpacking' ? 'selected' : ''}>Backpacking</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="modalGroupSize">Typical Group Size</label>
                                <input type="number" id="modalGroupSize" name="groupSize" min="1" max="20" 
                                       value="${profileUser.group_size || 1}">
                            </div>

                            <div class="form-group">
                                <label for="modalDietary">Dietary Restrictions</label>
                                <select id="modalDietary" name="dietaryRestrictions">
                                    <option value="">No restrictions</option>
                                    <option value="vegetarian" ${profileUser.dietary_restrictions === 'vegetarian' ? 'selected' : ''}>Vegetarian</option>
                                    <option value="vegan" ${profileUser.dietary_restrictions === 'vegan' ? 'selected' : ''}>Vegan</option>
                                    <option value="gluten_free" ${profileUser.dietary_restrictions === 'gluten_free' ? 'selected' : ''}>Gluten-Free</option>
                                    <option value="dairy_free" ${profileUser.dietary_restrictions === 'dairy_free' ? 'selected' : ''}>Dairy-Free</option>
                                    <option value="nut_allergy" ${profileUser.dietary_restrictions === 'nut_allergy' ? 'selected' : ''}>Nut Allergy</option>
                                    <option value="kosher" ${profileUser.dietary_restrictions === 'kosher' ? 'selected' : ''}>Kosher</option>
                                    <option value="halal" ${profileUser.dietary_restrictions === 'halal' ? 'selected' : ''}>Halal</option>
                                    <option value="other" ${profileUser.dietary_restrictions === 'other' ? 'selected' : ''}>Other</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="submit" class="ios-button-primary flex-1">
                        <span class="material-icons mr-2" style="font-size: 16px;">save</span>Save Changes
                    </button>
                    <button type="button" onclick="app.closeModal()" class="ios-button-secondary">
                        Cancel
                    </button>
                </div>
            </form>
        `;
        
        this.showModal('Edit Profile', modalContent);
        
        // Handle form submission
        document.getElementById('modalProfileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleModalProfileUpdate(e);
        });
        
        // Focus first input
        setTimeout(() => {
            document.getElementById('modalFirstName').focus();
        }, 100);
    }

    async handleModalProfileUpdate(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const profileData = {
            firstName: (formData.get('firstName') || '').trim(),
            lastName: (formData.get('lastName') || '').trim(),
            phone: (formData.get('phone') || '').trim(),
            bio: (formData.get('bio') || '').trim(),
            camperType: formData.get('camperType') || '',
            groupSize: parseInt(formData.get('groupSize')) || 1,
            dietaryRestrictions: formData.get('dietaryRestrictions') || '',
            homeAddress: (formData.get('homeAddress') || '').trim(),
            homeCity: (formData.get('homeCity') || '').trim(),
            homeState: (formData.get('homeState') || '').trim(),
            homeZip: (formData.get('homeZip') || '').trim(),
            homeCountry: 'United States'
        };

        try {
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(profileData)
            });

            const data = await response.json();

            if (response.ok) {
                // Update current user data
                this.currentUser = { ...this.currentUser, ...data.user };
                
                this.showMessage('Profile updated successfully!', 'success');
                this.closeModal();
                
                // Refresh dashboard data to show updated profile completeness
                this.loadDashboardData();
            } else {
                if (data.errors) {
                    const errorMessages = data.errors.map(err => err.msg).join(', ');
                    this.showMessage(errorMessages, 'error');
                } else {
                    this.showMessage(data.error || 'Failed to update profile', 'error');
                }
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showMessage('Network error. Please try again.', 'error');
        }
    }
    
    populateProfileEditForm(user) {
        // Populate all the form fields with user data
        const setFieldValue = (id, value) => {
            const field = document.getElementById(id);
            if (field) {
                field.value = value || '';
                console.log(`Set ${id} to:`, value);
            } else {
                console.log(`Field ${id} not found`);
            }
        };
        
        // Populate all fields including the new address fields
        setFieldValue('editFirstName', user.first_name);
        setFieldValue('editLastName', user.last_name);
        setFieldValue('editPhone', user.phone);
        setFieldValue('editBio', user.bio);
        setFieldValue('editCamperType', user.camper_type);
        setFieldValue('editGroupSize', user.group_size || 1);
        setFieldValue('editDietary', user.dietary_restrictions);
        
        // Address fields
        setFieldValue('editHomeAddress', user.home_address);
        setFieldValue('editHomeCity', user.home_city);
        setFieldValue('editHomeState', user.home_state);
        setFieldValue('editHomeZip', user.home_zip);
        
        console.log('Profile form populated with user data:', user);
    }

    async viewUserProfile(userId, userName) {
        try {
            const response = await fetch(`/api/profile/${userId}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.showUserProfileModal(data.user, userName);
            } else {
                this.showMessage('Unable to load profile', 'error');
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            this.showMessage('Network error loading profile', 'error');
        }
    }

    showUserProfileModal(profile, userName) {
        const modalContent = `
            <div class="max-w-lg mx-auto">
                <div class="text-center mb-6">
                    <div class="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style="background: var(--ios-blue); opacity: 0.2;">
                        <span class="material-icons" style="font-size: 40px; color: var(--ios-blue);">person</span>
                    </div>
                    <h3 class="text-xl font-semibold" style="color: var(--text-primary);">${userName}</h3>
                    <p class="text-sm" style="color: var(--text-secondary);">Member since ${new Date(profile.created_at).toLocaleDateString()}</p>
                </div>

                <div class="space-y-4">
                    <!-- Bio -->
                    ${profile.bio ? `
                        <div>
                            <h4 class="font-medium mb-2" style="color: var(--text-primary);">About</h4>
                            <p class="text-sm" style="color: var(--text-secondary);">${profile.bio}</p>
                        </div>
                    ` : ''}

                    <!-- Camping Style -->
                    ${profile.camper_type ? `
                        <div>
                            <h4 class="font-medium mb-2" style="color: var(--text-primary);">Camping Style</h4>
                            <div class="inline-flex items-center px-3 py-1 rounded-full text-sm" style="background: var(--ios-blue); color: white;">
                                <span class="material-icons mr-1" style="font-size: 16px;">
                                    ${profile.camper_type === 'tent' ? 'nature' : 
                                      profile.camper_type === 'rv' || profile.camper_type === 'trailer' ? 'rv_hookup' : 
                                      profile.camper_type === 'cabin' ? 'cabin' : 
                                      profile.camper_type === 'glamping' ? 'hotel' : 'nature'}
                                </span>
                                ${profile.camper_type.charAt(0).toUpperCase() + profile.camper_type.slice(1).replace('_', ' ')} Camper
                            </div>
                        </div>
                    ` : ''}

                    <!-- Group Size -->
                    ${profile.group_size ? `
                        <div>
                            <h4 class="font-medium mb-2" style="color: var(--text-primary);">Typical Group Size</h4>
                            <p class="text-sm" style="color: var(--text-secondary);">👥 ${profile.group_size} ${profile.group_size === 1 ? 'person' : 'people'}</p>
                        </div>
                    ` : ''}

                    <!-- Dietary Restrictions -->
                    ${profile.dietary_restrictions ? `
                        <div>
                            <h4 class="font-medium mb-2" style="color: var(--text-primary);">Dietary Restrictions</h4>
                            <div class="flex flex-wrap gap-2">
                                <span class="inline-flex items-center px-2 py-1 rounded text-xs" style="background: var(--ios-orange); color: white;">
                                    🍽️ ${profile.dietary_restrictions.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Contact (only if available - for public profiles this won't show) -->
                    ${profile.phone ? `
                        <div>
                            <h4 class="font-medium mb-2" style="color: var(--text-primary);">Contact</h4>
                            <p class="text-sm" style="color: var(--text-secondary);">📞 ${profile.phone}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        this.showModal(`${userName}'s Profile`, modalContent);
    }

    
    async handleUpdateProfile(e) {
        e.preventDefault();
        
        // Get form data using FormData API - more reliable
        const form = e.target;
        const formData = new FormData(form);
        
        const profileData = {
            firstName: (formData.get('firstName') || '').trim(),
            lastName: (formData.get('lastName') || '').trim(),
            bio: (formData.get('bio') || '').trim(),
            camperType: formData.get('camperType') || '',
            groupSize: parseInt(formData.get('groupSize')) || 1,
            dietaryRestrictions: formData.get('dietaryRestrictions') || '',
            phone: (formData.get('phone') || '').trim(),
            homeAddress: (formData.get('homeAddress') || '').trim(),
            homeCity: (formData.get('homeCity') || '').trim(),
            homeState: (formData.get('homeState') || '').trim(),
            homeZip: (formData.get('homeZip') || '').trim(),
            homeCountry: 'United States'
        };
        
        console.log('Profile data to send:', profileData);
        
        // Simple validation
        if (!profileData.firstName) {
            this.showMessage('First name is required', 'error');
            return;
        }
        
        if (!profileData.lastName) {
            this.showMessage('Last name is required', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(profileData)
            });
            
            const data = await response.json();
            console.log('Server response:', data);
            
            if (response.ok) {
                this.showMessage('Profile updated successfully!', 'success');
                // Update current user data
                this.currentUser.firstName = data.user.first_name;
                this.currentUser.lastName = data.user.last_name;
                // Update header display
                document.getElementById('headerUserName').textContent = `${data.user.first_name} ${data.user.last_name}`;
                // Refresh profile display
                this.displayProfile(data.user, true);
            } else {
                console.error('Server error:', data);
                if (data.errors) {
                    const errorMessages = data.errors.map(err => err.msg).join(', ');
                    this.showMessage(errorMessages, 'error');
                } else {
                    this.showMessage(data.error || 'Failed to update profile', 'error');
                }
            }
        } catch (error) {
            console.error('Network error:', error);
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    // Trip Loading Methods
    async loadMyTrips() {
        try {
            const response = await fetch('/api/trips/my', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.myTrips = data.trips;
                this.renderMyTrips();
            } else {
                // If endpoint doesn't exist, fall back to filtering all trips
                await this.loadAllTripsAndFilterMine();
            }
        } catch (error) {
            console.error('Error loading my trips:', error);
            await this.loadAllTripsAndFilterMine();
        }
    }

    generateTripCode(targetElementId = 'generatedTripCode') {
        // Generate a unique 6-character alphanumeric code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const element = document.getElementById(targetElementId);
        if (element) {
            element.textContent = code;
        }
        return code;
    }

    async handleJoinByCode() {
        const tripCode = document.getElementById('tripCode').value.trim();
        if (!tripCode) {
            this.showMessage('Please enter a trip code', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/trips/join-by-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ tripCode })
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage(`Successfully joined "${data.trip.title}"!`, 'success');
                // Clear the input
                document.getElementById('tripCode').value = '';
                // Refresh user's trips and go back to dashboard
                setTimeout(() => {
                    this.loadMyTrips();
                    this.showMyTripsView();
                }, 1500);
            } else {
                if (data.errors) {
                    const errorMessages = data.errors.map(err => err.msg).join(', ');
                    this.showMessage(errorMessages, 'error');
                } else {
                    this.showMessage(data.error || 'Failed to join trip', 'error');
                }
            }
        } catch (error) {
            console.error('Error joining trip by code:', error);
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    async loadAllTripsAndFilterMine() {
        try {
            const response = await fetch('/api/trips', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                // Filter to only trips user is participating in or organizing
                this.myTrips = data.trips.filter(trip => {
                    const isOrganizer = this.currentUser && this.currentUser.id === trip.organizer_id;
                    const isParticipant = trip.participants && trip.participants.some(p => 
                        p.name === `${this.currentUser.firstName} ${this.currentUser.lastName}`);
                    return isOrganizer || isParticipant;
                });
                this.renderMyTrips();
            } else {
                this.showMessage('Failed to load trips', 'error');
            }
        } catch (error) {
            console.error('Error loading trips:', error);
            this.showMessage('Network error loading trips', 'error');
        }
    }

    async loadAllTrips() {
        try {
            const response = await fetch('/api/trips', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.allTrips = data.trips;
                this.renderAllTrips();
            } else {
                this.showMessage('Failed to load trips', 'error');
            }
        } catch (error) {
            console.error('Error loading trips:', error);
            this.showMessage('Network error loading trips', 'error');
        }
    }

    renderMyTrips() {
        const tripsList = document.getElementById('myTripsList');
        const noTrips = document.getElementById('noMyTrips');

        if (!this.myTrips || this.myTrips.length === 0) {
            tripsList.innerHTML = '';
            noTrips.classList.remove('hidden');
            return;
        }

        noTrips.classList.add('hidden');
        tripsList.innerHTML = this.myTrips.map(trip => this.createTripSnapshotCard(trip)).join('');
        
        // Add event delegation for trip card clicks
        tripsList.addEventListener('click', (e) => {
            const tripCard = e.target.closest('.trip-card');
            if (tripCard) {
                const tripId = tripCard.dataset.tripId;
                if (tripId) {
                    this.showTripDetails(parseInt(tripId));
                }
            }
        });
    }

    renderAllTrips() {
        const tripsList = document.getElementById('allTripsList');

        if (!this.allTrips || this.allTrips.length === 0) {
            tripsList.innerHTML = '<div class="col-span-full text-center py-8 text-gray-500"><p>No public trips available</p></div>';
            return;
        }

        tripsList.innerHTML = this.allTrips.map(trip => this.createTripSnapshotCard(trip)).join('');
        
        // Add event delegation for trip card clicks
        tripsList.addEventListener('click', (e) => {
            const tripCard = e.target.closest('.trip-card');
            if (tripCard) {
                const tripId = tripCard.dataset.tripId;
                if (tripId) {
                    this.showTripDetails(parseInt(tripId));
                }
            }
        });
    }

    createTripSnapshotCard(trip) {
        const startDate = new Date(trip.start_date).toLocaleDateString();
        const endDate = new Date(trip.end_date).toLocaleDateString();
        const difficultyColors = {
            easy: 'bg-green-100 text-green-800',
            moderate: 'bg-yellow-100 text-yellow-800',
            difficult: 'bg-red-100 text-red-800'
        };
        const typeIcons = {
            car_camping: 'directions_car',
            backpacking: 'hiking',
            rv_camping: 'rv_hookup',
            glamping: 'hotel'
        };

        const isOrganizer = this.currentUser && this.currentUser.id === trip.organizer_id;
        const isParticipant = trip.participants && trip.participants.some(p => p.name === `${this.currentUser.firstName} ${this.currentUser.lastName}`);
        const canJoin = this.currentUser && !isParticipant && trip.current_participants < trip.max_participants;

        const mapId = `mini-map-${trip.id}`;
        
        // Create the card and then add the map asynchronously
        setTimeout(async () => {
            const coords = await this.geocodeLocation(trip.location);
            if (coords) {
                this.createMiniMap(mapId, coords.lat, coords.lon, trip.location);
            }
        }, 100);

        return `
            <div class="ios-card cursor-pointer trip-card" 
                 data-trip-id="${trip.id}">
                <div class="p-5">
                    <div class="flex justify-between items-start mb-4">
                        <h4 class="ios-headline truncate-2 flex-1 mr-3">${trip.title}</h4>
                        <div class="flex gap-2 flex-shrink-0">
                            ${this.getStatusBadge(trip.status || 'planning')}
                            ${trip.difficulty_level ? `
                                <span class="px-3 py-1 text-xs rounded-full font-medium" style="background: var(--ios-gray-6); color: var(--ios-secondary-label);">
                                    ${trip.difficulty_level}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Mini Map -->
                    <div id="${mapId}" style="height: 100px; width: 100%; border-radius: 8px; margin-bottom: 12px; background: #f3f4f6;" class="sm:h-[120px] sm:mb-4"></div>
                    
                    <div class="space-y-3 mb-4">
                        <div class="flex items-center min-w-0">
                            <span class="material-icons mr-3 flex-shrink-0" style="font-size: 18px; color: var(--ios-gray);">place</span>
                            <span class="ios-callout truncate">${trip.location}</span>
                        </div>
                        <div class="flex items-center">
                            <span class="material-icons mr-3 flex-shrink-0" style="font-size: 18px; color: var(--ios-gray);">event</span>
                            <span class="ios-callout">${startDate}</span>
                        </div>
                        <div class="flex items-center">
                            <span class="material-icons mr-3 flex-shrink-0" style="font-size: 18px; color: var(--ios-gray);">group</span>
                            <span class="ios-callout">${trip.current_participants}/${trip.max_participants} going</span>
                        </div>
                    </div>

                    <div class="flex items-center justify-between flex-wrap gap-3">
                        <div class="flex items-center min-w-0">
                            <span class="material-icons mr-2 flex-shrink-0" style="font-size: 16px; color: var(--ios-blue);">${typeIcons[trip.trip_type]}</span>
                            <span class="ios-footnote truncate">${trip.trip_type.replace('_', ' ')}</span>
                        </div>
                        
                        ${isOrganizer ? `
                            <span class="px-2 py-1 rounded-full font-medium flex items-center flex-shrink-0 ios-footnote" style="background: var(--ios-blue); color: white;">
                                <span class="material-icons mr-1" style="font-size: 12px;">star</span><span class="hidden sm:inline">Organizer</span><span class="sm:hidden">Org</span>
                            </span>
                        ` : isParticipant ? `
                            <span class="px-2 py-1 rounded-full font-medium flex items-center flex-shrink-0 ios-footnote" style="background: var(--ios-green); color: white;">
                                <span class="material-icons mr-1" style="font-size: 12px;">check_circle</span><span class="hidden sm:inline">Joined</span><span class="sm:hidden">✓</span>
                            </span>
                        ` : canJoin ? `
                            <span class="px-2 py-1 rounded-full font-medium flex items-center flex-shrink-0 ios-footnote" style="background: white; color: var(--ios-blue); border: 1px solid var(--ios-blue);">
                                <span class="material-icons mr-1" style="font-size: 12px;">add_circle</span><span class="hidden sm:inline">Available</span><span class="sm:hidden">Open</span>
                            </span>
                        ` : `
                            <span class="px-2 py-1 rounded-full font-medium flex items-center flex-shrink-0 ios-footnote" style="background: var(--ios-red); color: white;">
                                <span class="material-icons mr-1" style="font-size: 12px;">cancel</span><span class="sm:hidden">Full</span>
                            </span>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    createTripCard(trip) {
        const startDate = new Date(trip.start_date).toLocaleDateString();
        const endDate = new Date(trip.end_date).toLocaleDateString();
        const difficultyColors = {
            easy: 'bg-green-100 text-green-800',
            moderate: 'bg-yellow-100 text-yellow-800',
            difficult: 'bg-red-100 text-red-800'
        };
        const typeIcons = {
            car_camping: 'directions_car',
            backpacking: 'hiking',
            rv_camping: 'rv_hookup',
            glamping: 'hotel'
        };

        const isOrganizer = this.currentUser && this.currentUser.id === trip.organizer_id;
        const isParticipant = trip.participants && trip.participants.some(p => p.name === `${this.currentUser.firstName} ${this.currentUser.lastName}`);
        const canJoin = this.currentUser && !isParticipant && trip.current_participants < trip.max_participants;

        return `
            <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow" id="trip-${trip.id}">
                <div class="flex justify-between items-start mb-4">
                    <h4 class="text-xl font-semibold text-gray-800">${trip.title}</h4>
                    <div class="flex gap-2">
                        ${trip.difficulty_level ? `
                            <span class="px-2 py-1 text-xs rounded-full ${difficultyColors[trip.difficulty_level]}">
                                ${trip.difficulty_level}
                            </span>
                        ` : ''}
                        <span class="px-2 py-1 text-xs rounded-full" style="background: var(--accent-blue); color: #000;">
                            <span class="material-icons text-sm mr-1">${typeIcons[trip.trip_type]}</span>
                            ${trip.trip_type.replace('_', ' ')}
                        </span>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="space-y-2 text-sm text-gray-600">
                        <div class="flex items-center">
                            <span class="material-icons text-base mr-2 text-gray-400">place</span>
                            <span>${trip.location}</span>
                        </div>
                        <div class="flex items-center">
                            <span class="material-icons text-base mr-2 text-gray-400">event</span>
                            <span>${startDate} - ${endDate}</span>
                        </div>
                        ${trip.campground ? `
                            <div class="flex items-center">
                                <span class="material-icons text-base mr-2 text-gray-400">nature</span>
                                <span>${trip.campground}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="space-y-2 text-sm text-gray-600">
                        <div class="flex items-center">
                            <span class="material-icons text-base mr-2 text-gray-400">group</span>
                            <span>${trip.current_participants}/${trip.max_participants} participants</span>
                        </div>
                        <div class="flex items-center">
                            <span class="material-icons text-base mr-2 text-gray-400">person</span>
                            <span>Organized by ${this.createClickableUsername(trip.organizer_name, trip.organizer_id)}</span>
                        </div>
                    </div>
                </div>

                ${trip.description ? `<p class="text-gray-700 text-sm mb-4">${trip.description}</p>` : ''}
                
                <div class="flex gap-2 pt-4 border-t">
                    ${canJoin ? `
                        <button onclick="app.joinTrip(${trip.id})" 
                                class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200">
                            <span class="material-icons text-sm mr-2">add</span>Join Trip
                        </button>
                    ` : ''}
                    ${isParticipant && !isOrganizer ? `
                        <button onclick="app.leaveTrip(${trip.id})" 
                                class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition duration-200">
                            <span class="material-icons text-sm mr-2">remove</span>Leave Trip
                        </button>
                    ` : ''}
                    ${isOrganizer ? `
                        <div class="px-4 py-2 rounded-md" style="background: var(--accent-blue); color: #000;">
                            <span class="material-icons text-sm mr-2">star</span>You organize this trip
                        </div>
                    ` : ''}
                    <button onclick="app.toggleTripDetails(${trip.id})" 
                            class="ml-auto text-blue-600 hover:text-blue-800 font-medium">
                        <span id="toggle-text-${trip.id}">Show Details</span> <span class="material-icons text-sm ml-1" id="toggle-icon-${trip.id}">expand_more</span>
                    </button>
                </div>
                
                <!-- Expandable Details -->
                <div id="trip-details-${trip.id}" class="hidden mt-4 pt-4 border-t bg-gray-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
                    <div class="text-sm text-gray-600">
                        <p class="font-medium mb-2">Trip Participants:</p>
                        <div id="participants-${trip.id}" class="space-y-1">
                            <!-- Participants will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }


    async handleCreateTrip(e) {
        e.preventDefault();

        const isPrivate = document.getElementById('tripPrivate').checked;
        const tripCode = isPrivate ? document.getElementById('generatedTripCode').textContent : null;
        
        const formData = {
            title: document.getElementById('tripTitle').value,
            description: document.getElementById('tripDescription').value,
            location: document.getElementById('tripLocation').value,
            startDate: document.getElementById('tripStartDate').value,
            endDate: document.getElementById('tripEndDate').value,
            tripType: document.getElementById('tripType').value,
            status: document.getElementById('tripStatus').value,
            isPublic: document.getElementById('tripPublic').checked,
            tripCode: tripCode
        };

        try {
            const response = await fetch('/api/trips', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage('Camping trip created successfully!', 'success');
                this.hideCreateTripSection();
                this.loadMyTrips(); // Refresh the user's trips list
            } else {
                if (data.errors) {
                    const errorMessages = data.errors.map(err => err.msg).join(', ');
                    this.showMessage(errorMessages, 'error');
                } else {
                    this.showMessage(data.error || 'Failed to create trip', 'error');
                }
            }
        } catch (error) {
            console.error('Error creating trip:', error);
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    async showTripDetails(tripId) {
        try {
            const response = await fetch(`/api/trips/${tripId}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.renderTripDetailsPage(data.trip);
                
                // Scroll to top to show the trip details
                this.scrollToTop();
            } else {
                this.showMessage('Failed to load trip details', 'error');
            }
        } catch (error) {
            console.error('Error loading trip details:', error);
            this.showMessage('Network error loading trip details', 'error');
        }
    }

    renderTripDetailsPage(trip) {
        const startDate = new Date(trip.start_date).toLocaleDateString();
        const endDate = new Date(trip.end_date).toLocaleDateString();
        const isOrganizer = this.currentUser && this.currentUser.id === trip.organizer_id;
        
        // Define type icons for trip details
        const typeIcons = {
            car_camping: 'directions_car',
            backpacking: 'hiking',
            rv_camping: 'rv_hookup',
            glamping: 'hotel'
        };
        const isParticipant = trip.participants && trip.participants.some(p => p.name === `${this.currentUser.firstName} ${this.currentUser.lastName}`);
        const canJoin = this.currentUser && !isParticipant && trip.current_participants < trip.max_participants;

        // Hide other sections and show trip details
        document.getElementById('myTripsContainer').classList.add('hidden');
        document.getElementById('allTripsContainer').classList.add('hidden');
        document.getElementById('createTripSection').classList.add('hidden');
        
        // Hide the entire dashboard content to avoid confusion
        const dashboardHeader = document.querySelector('#dashboard > .mb-8');
        if (dashboardHeader) {
            dashboardHeader.style.display = 'none';
        }
        
        const dashboardGrid = document.querySelector('#dashboard > .grid.grid-cols-1.lg\\:grid-cols-3');
        if (dashboardGrid) {
            dashboardGrid.style.display = 'none';
        }
        
        // Create or show trip details section
        let detailsSection = document.getElementById('tripDetailsSection');
        if (!detailsSection) {
            detailsSection = document.createElement('div');
            detailsSection.id = 'tripDetailsSection';
            detailsSection.className = 'mt-8';
            document.getElementById('dashboard').appendChild(detailsSection);
        }
        
        detailsSection.classList.remove('hidden');
        detailsSection.innerHTML = `
            <!-- Trip Header -->
            <div class="ios-card mb-6">
                <div class="p-6">
                    <!-- Back Button - Full Width -->
                    <button id="backFromDetailsBtn" class="ios-button-secondary w-full mb-6">
                        <span class="material-icons mr-2" style="font-size: 16px;">arrow_back</span>Back to Trips
                    </button>
                    
                    <!-- Trip Info -->
                    <div class="mb-6">
                        <h1 class="ios-title-1 mb-2">${trip.title}</h1>
                        <p class="ios-callout text-gray-600 mb-3">${trip.location}</p>
                        <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                            <span class="flex items-center">
                                <span class="material-icons mr-1" style="font-size: 16px;">event</span>
                                ${startDate} - ${endDate}
                            </span>
                            <span class="flex items-center">
                                <span class="material-icons mr-1" style="font-size: 16px;">group</span>
                                ${trip.current_participants}/${trip.max_participants} joined
                            </span>
                        </div>
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium" style="background: var(--ios-green); color: white;">
                            <span class="material-icons text-sm mr-1" style="font-size: 16px;">${typeIcons[trip.trip_type]}</span>
                            ${trip.trip_type.replace('_', ' ')}
                        </span>
                    </div>

                    <!-- Trip Description -->
                    ${trip.description ? `
                        <div class="mb-6 p-4 bg-gray-50 rounded-lg">
                            <h4 class="ios-callout font-medium text-gray-800 mb-2">About This Trip</h4>
                            <p class="ios-footnote text-gray-600 leading-relaxed">${trip.description}</p>
                        </div>
                    ` : ''}

                    <!-- Who's Going -->
                    <div class="mb-6">
                        <h4 class="ios-callout font-medium text-gray-800 mb-3">Who's Going</h4>
                        <div id="trip-participants-${trip.id}" class="space-y-2">
                            <!-- Participants will be loaded here -->
                        </div>
                    </div>

                    <!-- Trip Code -->
                    ${trip.trip_code ? `
                        <div class="trip-code mb-6" style="padding: 16px; border-radius: 12px; background: rgba(0, 122, 255, 0.1); border: 2px solid #007AFF; margin: 16px 0;">
                            <h4 style="margin-bottom: 12px; display: flex; align-items: center; color: #007AFF; font-weight: 600; font-size: 16px;">
                                <span class="material-icons" style="font-size: 18px; color: #007AFF; margin-right: 8px;">share</span>
                                Trip Code
                            </h4>
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                <div style="padding: 16px; border-radius: 8px; font-family: monospace; font-size: 24px; font-weight: bold; text-align: center; background: white; border: 2px solid #007AFF; color: #007AFF; letter-spacing: 2px;">
                                    ${trip.trip_code}
                                </div>
                                <button onclick="app.copyTripCode('${trip.trip_code}')" 
                                        class="ios-button-secondary" style="width: 100%; padding: 12px; font-size: 16px;">
                                    <span class="material-icons" style="font-size: 16px; margin-right: 8px;">content_copy</span>
                                    Copy Code
                                </button>
                            </div>
                            <p style="font-size: 12px; margin-top: 8px; color: #007AFF; text-align: center; line-height: 1.3;">Share this code with friends so they can join your trip</p>
                        </div>
                    ` : ''}
                    
                    <!-- Action Buttons - Edit Trip only -->
                    <div>
                        ${isOrganizer ? `
                            <button id="editTripBtn-${trip.id}" data-trip-id="${trip.id}" 
                                    class="ios-button-tertiary w-full py-3">
                                <span class="material-icons mr-2" style="font-size: 16px;">edit</span>Edit Trip
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>

            <!-- Tasks & Shopping Overview -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <!-- Tasks Summary -->
                <div class="ios-card">
                    <div class="p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="ios-title-3 flex items-center">
                                <span class="material-icons mr-3" style="font-size: 24px; color: var(--ios-blue);">checklist</span>
                                Trip Tasks
                            </h3>
                            <div class="flex items-center gap-3">
                                <span id="tripTaskCount-${trip.id}" class="px-3 py-1 rounded-full text-sm font-medium" 
                                      style="background: var(--ios-blue); color: white;">0</span>
                                <!-- Desktop Add Task Button -->
                                <button id="addTaskBtn-${trip.id}" data-trip-id="${trip.id}"
                                        class="ios-button-primary ios-button-compact" 
                                        style="display: none;"
                                        data-desktop-button="true">
                                    <span class="material-icons mr-1" style="font-size: 16px;">add</span>
                                    Add Task
                                </button>
                            </div>
                        </div>
                        <div id="tasksList-${trip.id}" class="space-y-3">
                            <!-- Tasks will be loaded here -->
                        </div>
                        <!-- Mobile Add Task Button -->
                        <button id="addTaskBtn-mobile-${trip.id}" data-trip-id="${trip.id}"
                                class="ios-button-primary w-full mt-4" 
                                style="display: none;"
                                data-mobile-button="true">
                            <span class="material-icons mr-2" style="font-size: 18px;">add</span>
                            Add Task
                        </button>
                    </div>
                </div>

                <!-- Shopping Summary -->
                <div class="ios-card">
                    <div class="p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="ios-title-3 flex items-center">
                                <span class="material-icons mr-3" style="font-size: 24px; color: var(--ios-purple);">shopping_cart</span>
                                Shopping List
                            </h3>
                            <div class="flex items-center gap-3">
                                <span id="tripShoppingCount-${trip.id}" class="px-3 py-1 rounded-full text-sm font-medium" 
                                      style="background: var(--ios-purple); color: white;">0</span>
                                <!-- Desktop Add Item Button -->
                                <button id="addShoppingItemBtn-${trip.id}" data-trip-id="${trip.id}"
                                        class="ios-button-secondary ios-button-compact" 
                                        style="display: none;"
                                        data-desktop-button="true">
                                    <span class="material-icons mr-1" style="font-size: 16px;">add</span>
                                    Add Item
                                </button>
                            </div>
                        </div>
                        <div id="shoppingList-${trip.id}" class="space-y-3">
                            <!-- Shopping items will be loaded here -->
                        </div>
                        <!-- Mobile Add Item Button -->
                        <button id="addShoppingItemBtn-mobile-${trip.id}" data-trip-id="${trip.id}"
                                class="ios-button-secondary w-full mt-4" 
                                style="display: none;"
                                data-mobile-button="true">
                            <span class="material-icons mr-2" style="font-size: 18px;">add</span>
                            Add Item
                        </button>
                    </div>
                </div>
            </div>

            <!-- Weather Forecast -->
            <div class="ios-card mb-6">
                <div class="p-6">
                    <div class="mb-4">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="ios-title-3 flex items-center">
                                <span class="material-icons mr-3" style="font-size: 24px; color: var(--ios-blue);">wb_sunny</span>
                                Weather Forecast
                            </h3>
                            <button id="refreshWeatherBtn-${trip.id}" data-trip-id="${trip.id}" 
                                    class="ios-button-secondary ios-button-compact hidden sm:flex">
                                <span class="material-icons mr-1" style="font-size: 14px;">refresh</span>Refresh
                            </button>
                        </div>
                        <div id="weatherForecast-${trip.id}">
                            <div class="text-center py-4 text-gray-500">
                                <span class="material-icons text-2xl mb-2 opacity-50">cloud</span>
                                <p class="ios-footnote">Loading weather forecast...</p>
                            </div>
                        </div>
                        <button id="refreshWeatherBtn-mobile-${trip.id}" data-trip-id="${trip.id}" 
                                class="ios-button-secondary w-full sm:hidden mobile-full-width-btn mt-4">
                            <span class="material-icons mr-2" style="font-size: 16px;">refresh</span>Refresh Weather
                        </button>
                    </div>
                </div>
            </div>

            <!-- Map -->
            <div class="mb-6">
                <div class="map-container" style="position: relative; margin-bottom: 16px;">
                    <div id="trip-detail-map" style="height: 300px; width: 100%; border-radius: 12px; background: var(--ios-gray-6); position: relative; z-index: 1;"></div>
                </div>
                
                <!-- Directions Button -->
                <button onclick="window.open('https://www.google.com/maps/search/' + encodeURIComponent('${trip.location.replace(/'/g, "\\'")}'), '_blank')" 
                        class="ios-button-secondary w-full" id="directionsButton">
                    <span class="material-icons mr-2">directions</span>Get Directions
                </button>
                
            </div>

            <!-- Trip Actions -->
            ${canJoin || (isParticipant && !isOrganizer) ? `
                <div class="ios-card">
                    <div class="p-6">
                        ${canJoin ? `
                            <button onclick="app.joinTrip(${trip.id})" 
                                    class="ios-button-primary w-full mb-3">
                                <span class="material-icons mr-2" style="font-size: 16px;">add</span>Join This Trip
                            </button>
                            <p class="ios-caption text-gray-500 text-center">
                                ${trip.current_participants}/${trip.max_participants} spots filled
                            </p>
                        ` : ''}
                        ${isParticipant && !isOrganizer ? `
                            <button onclick="app.leaveTrip(${trip.id})" 
                                    class="ios-button-secondary w-full" style="border-color: var(--ios-red); color: var(--ios-red);">
                                <span class="material-icons mr-2" style="font-size: 16px;">remove</span>Leave Trip
                            </button>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        `;
        
        // Add back button event listener
        document.getElementById('backFromDetailsBtn').addEventListener('click', () => {
            detailsSection.classList.add('hidden');
            this.showMyTripsView();
        });

        // Add collapsible details functionality
        const toggleButton = document.getElementById('toggleTripDetails');
        const detailsContent = document.getElementById('tripDetailsContent');
        const chevron = document.getElementById('detailsChevron');
        
        if (toggleButton && detailsContent && chevron) {
            toggleButton.addEventListener('click', () => {
                const isHidden = detailsContent.classList.contains('hidden');
                if (isHidden) {
                    detailsContent.classList.remove('hidden');
                    chevron.style.transform = 'rotate(180deg)';
                } else {
                    detailsContent.classList.add('hidden');
                    chevron.style.transform = 'rotate(0deg)';
                }
            });
        }

        // Add edit trip button event listener if it exists
        const editBtn = document.getElementById(`editTripBtn-${trip.id}`);
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.showEditTrip(trip.id);
            });
        }


        // Add task button event listeners (both desktop and mobile)
        const addTaskBtn = document.getElementById(`addTaskBtn-${trip.id}`);
        const addTaskBtnMobile = document.getElementById(`addTaskBtn-mobile-${trip.id}`);
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => {
                this.showAddTaskModal(trip.id);
            });
        }
        if (addTaskBtnMobile) {
            addTaskBtnMobile.addEventListener('click', () => {
                this.showAddTaskModal(trip.id);
            });
        }

        // Add shopping item button event listeners (both desktop and mobile)
        const addShoppingBtn = document.getElementById(`addShoppingItemBtn-${trip.id}`);
        const addShoppingBtnMobile = document.getElementById(`addShoppingItemBtn-mobile-${trip.id}`);
        if (addShoppingBtn) {
            addShoppingBtn.addEventListener('click', () => {
                this.showAddShoppingModal(trip.id);
            });
        }
        if (addShoppingBtnMobile) {
            addShoppingBtnMobile.addEventListener('click', () => {
                this.showAddShoppingModal(trip.id);
            });
        }

        // Load tasks, shopping items, weather, and participants for this trip
        this.initializeCollapsibleSections(trip.id);
        this.loadTripTasks(trip.id);
        this.loadTripShopping(trip.id);
        this.loadTripWeather(trip.id);
        
        // Initialize responsive button visibility
        this.initializeResponsiveButtons();
        
        // Render participants if they're already in the trip data
        if (trip.participants) {
            this.renderTripParticipantsForDetail(trip.id, trip.participants, trip.organizer_id);
        } else {
            this.loadTripParticipantsForDetail(trip.id, trip.organizer_id);
        }

        // Initialize full map for trip location
        setTimeout(async () => {
            const coords = await this.geocodeLocation(trip.location);
            if (coords) {
                this.createFullMap('trip-detail-map', coords.lat, coords.lon, trip.location);
                // Calculate and display directions - always try this
                console.log('🚀 Calling updateDirectionsButton for trip:', trip.title);
                await this.updateDirectionsButton(trip);
            }
        }, 500); // Increased timeout to ensure DOM is ready
    }

    async showEditTrip(tripId) {
        try {
            const response = await fetch(`/api/trips/${tripId}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.renderEditTripForm(data.trip);
                
                // Scroll to top to show the form
                this.scrollToTop();
            } else {
                this.showMessage('Failed to load trip for editing', 'error');
            }
        } catch (error) {
            console.error('Error loading trip for editing:', error);
            this.showMessage('Network error loading trip', 'error');
        }
    }

    renderEditTripForm(trip) {
        // Hide trip details and show edit form
        const detailsSection = document.getElementById('tripDetailsSection');
        if (detailsSection) {
            detailsSection.classList.add('hidden');
        }

        // Create or show edit trip section
        let editSection = document.getElementById('editTripSection');
        if (!editSection) {
            editSection = document.createElement('div');
            editSection.id = 'editTripSection';
            editSection.className = 'mt-8';
            document.getElementById('dashboard').appendChild(editSection);
        }

        editSection.classList.remove('hidden');
        editSection.innerHTML = `
            <div class="mb-6">
                <button id="backFromEditBtn" class="text-blue-600 hover:text-blue-800 font-medium mb-4">
                    <span class="material-icons text-sm mr-2">arrow_back</span>Back to Trip Details
                </button>
                <div class="bg-white rounded-lg shadow-lg p-8">
                    <h2 class="text-3xl font-bold text-gray-800 mb-6">Edit Trip</h2>
                    
                    <form id="editTripForm">
                        <input type="hidden" id="editTripId" value="${trip.id}">
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label for="editTripTitle" class="block text-sm font-medium text-gray-700 mb-2">Trip Title *</label>
                                <input type="text" id="editTripTitle" name="title" value="${trip.title}" required
                                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md">
                            </div>
                            <div>
                                <label for="editTripType" class="block text-sm font-medium text-gray-700 mb-2">Trip Type *</label>
                                <select id="editTripType" name="tripType" required
                                        class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md appearance-none bg-no-repeat bg-right pr-10" style="background-image: url('data:image/svg+xml;charset=US-ASCII,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 4 5%22><path fill=%22%23666%22 d=%22M2 0L0 2h4zm0 5L0 3h4z%22/></svg>'); background-position: right 12px center; background-size: 12px;">
                                    <option value="car_camping" ${trip.trip_type === 'car_camping' ? 'selected' : ''}>Car Camping</option>
                                    <option value="backpacking" ${trip.trip_type === 'backpacking' ? 'selected' : ''}>Backpacking</option>
                                    <option value="rv_camping" ${trip.trip_type === 'rv_camping' ? 'selected' : ''}>RV Camping</option>
                                    <option value="glamping" ${trip.trip_type === 'glamping' ? 'selected' : ''}>Glamping</option>
                                </select>
                            </div>
                        </div>

                        <div class="mb-6">
                            <label for="editTripLocation" class="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                            <input type="text" id="editTripLocation" name="location" value="${trip.location}" required
                                   class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md">
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label for="editStartDate" class="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                                <input type="date" id="editStartDate" name="startDate" value="${trip.start_date.split('T')[0]}" required
                                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md">
                            </div>
                            <div>
                                <label for="editEndDate" class="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                                <input type="date" id="editEndDate" name="endDate" value="${trip.end_date.split('T')[0]}" required
                                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md">
                            </div>
                        </div>

                        <div class="mb-6">
                            <label for="editMaxParticipants" class="block text-sm font-medium text-gray-700 mb-2">Max Participants *</label>
                            <input type="number" id="editMaxParticipants" name="maxParticipants" value="${trip.max_participants}" min="1" max="50" required
                                   class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md">
                        </div>

                        <div class="mb-6">
                            <label class="block text-sm font-medium text-gray-700 mb-3">Trip Visibility *</label>
                            <div class="space-y-3">
                                <label class="flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 ${trip.is_public ? 'bg-blue-50 border-blue-200' : ''}" style="background: var(--ios-secondary-grouped-background); border: 1px solid var(--border-secondary); color: var(--text-primary);">
                                    <input type="radio" name="visibility" value="public" ${trip.is_public ? 'checked' : ''}
                                           class="h-4 w-4" style="accent-color: var(--ios-blue);">
                                    <span class="ml-3">
                                        <span style="color: var(--text-primary); font-weight: 600; font-size: 16px; display: block;">Public Trip</span>
                                        <span style="color: var(--text-secondary); font-size: 14px; display: block; margin-top: 4px;">Anyone can discover and join this trip</span>
                                    </span>
                                </label>
                                <label class="flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 ${!trip.is_public ? 'bg-blue-50 border-blue-200' : ''}" style="background: var(--ios-secondary-grouped-background); border: 1px solid var(--border-secondary); color: var(--text-primary);">
                                    <input type="radio" name="visibility" value="private" ${!trip.is_public ? 'checked' : ''}
                                           class="h-4 w-4" style="accent-color: var(--ios-blue);">
                                    <span class="ml-3">
                                        <span style="color: var(--text-primary); font-weight: 600; font-size: 16px; display: block;">Private Trip</span>
                                        <span style="color: var(--text-secondary); font-size: 14px; display: block; margin-top: 4px;">Only people with the trip code can join</span>
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div class="mb-8">
                            <label for="editDescription" class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea id="editDescription" name="description" rows="4"
                                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md resize-none"
                                      placeholder="Describe the camping trip, what to expect, what to bring, etc.">${trip.description || ''}</textarea>
                        </div>

                        <!-- Mobile: Stack buttons vertically, Desktop: 2+1 layout -->
                        <div class="space-y-3 md:space-y-0">
                            <!-- Primary actions row -->
                            <div class="flex flex-col md:flex-row gap-3">
                                <button type="submit" class="ios-button-primary w-full md:flex-1">
                                    <span class="material-icons mr-2" style="font-size: 16px;">save</span>Update Trip
                                </button>
                                <button type="button" id="cancelEditTripBtn" class="ios-button-secondary w-full md:flex-1">
                                    <span class="material-icons mr-2" style="font-size: 16px;">close</span>Cancel
                                </button>
                            </div>
                            <!-- Delete button separate row -->
                            <button type="button" id="deleteEditTripBtn" data-trip-id="${trip.id}"
                                    class="w-full px-4 py-3 border border-red-300 text-red-700 rounded-xl transition-all duration-200 flex items-center justify-center font-medium"
                                    style="background: var(--bg-card); min-height: 44px;"
                                    onmouseover="this.style.backgroundColor='rgba(239, 68, 68, 0.1)'; this.style.borderColor='var(--ios-red)'; this.style.color='var(--ios-red)'"
                                    onmouseout="this.style.backgroundColor='var(--bg-card)'; this.style.borderColor=''; this.style.color=''">
                                <span class="material-icons mr-2" style="font-size: 16px;">delete</span>Delete Trip
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Add event listeners
        document.getElementById('backFromEditBtn').addEventListener('click', () => {
            editSection.classList.add('hidden');
            this.showTripDetails(trip.id);
        });

        document.getElementById('cancelEditTripBtn').addEventListener('click', () => {
            editSection.classList.add('hidden');
            this.showTripDetails(trip.id);
        });

        document.getElementById('editTripForm').addEventListener('submit', (e) => {
            this.handleUpdateTrip(e);
        });

        // Add delete button event listener
        document.getElementById('deleteEditTripBtn').addEventListener('click', () => {
            this.confirmDeleteTrip(trip.id, trip.title);
        });

        // Initialize address lookup for edit form
        setTimeout(() => {
            const locationInput = document.getElementById('editTripLocation');
            if (locationInput) {
                // The address lookup will automatically work on this input field
                console.log('Edit form location input ready for address lookup');
            }
        }, 100);
    }

    async handleUpdateTrip(e) {
        e.preventDefault();
        
        const tripId = document.getElementById('editTripId').value;
        const formData = new FormData(e.target);
        
        const tripData = {
            title: formData.get('title'),
            tripType: formData.get('tripType'),
            location: formData.get('location'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            maxParticipants: parseInt(formData.get('maxParticipants')),
            visibility: formData.get('visibility'),
            description: formData.get('description')
        };

        try {
            const response = await fetch(`/api/trips/${tripId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(tripData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage('Trip updated successfully!', 'success');
                
                // Hide edit form and show updated trip details
                const editSection = document.getElementById('editTripSection');
                if (editSection) {
                    editSection.classList.add('hidden');
                }
                
                // Refresh trip details
                this.showTripDetails(tripId);
                
                // Refresh trip lists
                this.loadMyTrips();
                this.loadAllTrips();
            } else {
                if (data.errors) {
                    const errorMessages = data.errors.map(err => err.msg).join(', ');
                    this.showMessage(errorMessages, 'error');
                } else {
                    this.showMessage(data.error || 'Failed to update trip', 'error');
                }
            }
        } catch (error) {
            console.error('Network error:', error);
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    async loadTripTasks(tripId) {
        try {
            const response = await fetch(`/api/tasks/trip/${tripId}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.renderTasks(tripId, data.tasks);
            } else {
                console.error('Failed to load tasks');
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    renderTasks(tripId, tasks) {
        const tasksList = document.getElementById(`tasksList-${tripId}`);
        const countBadge = document.getElementById(`tripTaskCount-${tripId}`);
        
        if (!tasksList) return;

        if (!tasks || tasks.length === 0) {
            // Update count badge
            if (countBadge) {
                countBadge.textContent = 0;
            }
            
            tasksList.innerHTML = `
                <div class="text-center py-6 text-gray-500">
                    <span class="material-icons text-3xl mb-2 opacity-50">assignment</span>
                    <p class="ios-callout">No tasks yet</p>
                    <p class="ios-footnote">Add tasks to organize your trip</p>
                </div>
            `;
            return;
        }

        // Calculate progress
        const completedTasks = tasks.filter(task => task.is_completed);
        const totalTasks = tasks.length;
        const pendingTasks = tasks.filter(task => !task.is_completed);
        
        // Update count badge with pending tasks
        if (countBadge) {
            countBadge.textContent = pendingTasks.length;
        }

        // Add progress bar at the top
        const progressHtml = `
            <div class="mb-4 p-4 rounded-lg" style="background: var(--ios-gray-6);">
                ${this.getProgressBar(completedTasks.length, totalTasks, 'task')}
            </div>
        `;

        tasksList.innerHTML = progressHtml + tasks.map(task => this.createTaskCard(task)).join('');

        // Add event listeners for task actions
        tasks.forEach(task => {
            // Complete/uncomplete task
            const completeBtn = document.getElementById(`completeTask-${task.id}`);
            if (completeBtn) {
                completeBtn.addEventListener('click', () => {
                    this.toggleTaskCompletion(task.id, tripId);
                });
            }

            // Edit task
            const editBtn = document.getElementById(`editTask-${task.id}`);
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    this.showEditTaskForm(task);
                });
            }

            // Delete task
            const deleteBtn = document.getElementById(`deleteTask-${task.id}`);
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    this.deleteTask(task.id, tripId);
                });
            }
        });
    }

    createTaskCard(task) {
        const isOverdue = task.has_due_date && task.due_date && new Date(task.due_date) < new Date() && !task.is_completed;
        const dueDate = task.has_due_date && task.due_date ? new Date(task.due_date).toLocaleDateString() : null;
        const dueTime = task.has_due_date && task.due_date ? new Date(task.due_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : null;
        
        let assignmentText = '';
        if (task.assignment_type === 'everyone') {
            assignmentText = 'Everyone';
        } else if (task.assignment_type === 'anyone') {
            assignmentText = 'Anyone';
        } else if (task.assignment_type === 'specific' && task.assigned_to_name) {
            assignmentText = task.assigned_to_name;
        }

        return `
            <div class="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 ${task.is_completed ? 'opacity-75' : ''} ${isOverdue ? 'border-red-200 bg-red-50' : ''}">
                <div class="flex items-start justify-between">
                    <div class="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
                        <button id="completeTask-${task.id}" 
                                class="mt-1 w-6 h-6 sm:w-5 sm:h-5 rounded border-2 border-gray-300 flex items-center justify-center hover:border-green-500 transition-colors flex-shrink-0 ${task.is_completed ? 'bg-green-500 border-green-500' : ''}">
                            ${task.is_completed ? '<span class="material-icons text-white text-sm">check</span>' : ''}
                        </button>
                        <div class="flex-1 min-w-0">
                            <h4 class="font-medium text-sm sm:text-base text-gray-900 ${task.is_completed ? 'line-through text-gray-500' : ''} truncate-2">${task.title}</h4>
                            ${task.description ? `<p class="text-xs sm:text-sm text-gray-600 mt-1 ${task.is_completed ? 'line-through' : ''} truncate-2">${task.description}</p>` : ''}
                            
                            <div class="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                                <div class="flex items-center flex-shrink-0">
                                    <span class="material-icons text-sm mr-1">person</span>
                                    <span class="truncate">${assignmentText}</span>
                                </div>
                                ${task.has_due_date && dueDate ? `
                                    <div class="flex items-center flex-shrink-0 ${isOverdue ? 'text-red-600 font-medium' : ''}">
                                        <span class="material-icons text-sm mr-1">schedule</span>
                                        <span class="hidden sm:inline">${dueDate} ${dueTime ? `at ${dueTime}` : ''}</span>
                                        <span class="sm:hidden">${dueDate.split('/').slice(0,2).join('/')}</span>
                                        ${isOverdue ? '<span class="hidden sm:inline"> (Overdue)</span><span class="sm:hidden text-red-600">!</span>' : ''}
                                    </div>
                                ` : ''}
                                <div class="flex items-center flex-shrink-0 hidden sm:flex">
                                    <span class="material-icons text-sm mr-1">person_add</span>
                                    <span class="truncate">${task.created_by_name}</span>
                                </div>
                                ${task.is_completed && task.completed_by_name ? `
                                    <div class="flex items-center text-green-600 flex-shrink-0 hidden sm:flex">
                                        <span class="material-icons text-sm mr-1">check_circle</span>
                                        <span class="truncate">Completed by ${task.completed_by_name}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex items-center space-x-1 sm:space-x-2 ml-2 sm:ml-4 flex-shrink-0">
                        <button id="editTask-${task.id}" 
                                class="text-gray-400 hover:text-blue-600 transition-colors p-2 sm:p-1">
                            <span class="material-icons text-base sm:text-sm">edit</span>
                        </button>
                        <button id="deleteTask-${task.id}" 
                                class="text-gray-400 hover:text-red-600 transition-colors p-2 sm:p-1">
                            <span class="material-icons text-base sm:text-sm">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async toggleTaskCompletion(taskId, tripId) {
        try {
            const response = await fetch(`/api/tasks/${taskId}/complete`, {
                method: 'PATCH',
                credentials: 'include'
            });

            if (response.ok) {
                // Reload tasks to show updated state
                this.loadTripTasks(tripId);
            } else {
                this.showMessage('Failed to update task', 'error');
            }
        } catch (error) {
            console.error('Error toggling task completion:', error);
            this.showMessage('Network error updating task', 'error');
        }
    }

    async deleteTask(taskId, tripId) {
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }

        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                this.showMessage('Task deleted successfully', 'success');
                this.loadTripTasks(tripId);
            } else {
                this.showMessage('Failed to delete task', 'error');
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            this.showMessage('Network error deleting task', 'error');
        }
    }

    async showAddTaskForm(tripId) {
        // First get trip participants for assignment dropdown
        try {
            const response = await fetch(`/api/trips/${tripId}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.renderTaskForm(tripId, null, data.trip);
                
                // Scroll to top to show the form
                this.scrollToTop();
            } else {
                this.showMessage('Failed to load trip details', 'error');
            }
        } catch (error) {
            console.error('Error loading trip details:', error);
            this.showMessage('Network error', 'error');
        }
    }

    renderTaskForm(tripId, task = null, trip) {
        const isEdit = task !== null;
        const formTitle = isEdit ? 'Edit Task' : 'Add New Task';
        
        // Hide trip details and show task form
        const detailsSection = document.getElementById('tripDetailsSection');
        if (detailsSection) {
            detailsSection.classList.add('hidden');
        }

        // Create or show task form section
        let taskFormSection = document.getElementById('taskFormSection');
        if (!taskFormSection) {
            taskFormSection = document.createElement('div');
            taskFormSection.id = 'taskFormSection';
            taskFormSection.className = 'mt-8';
            document.getElementById('dashboard').appendChild(taskFormSection);
        }

        taskFormSection.classList.remove('hidden');
        taskFormSection.innerHTML = `
            <div class="mb-6">
                <button id="backFromTaskFormBtn" class="text-blue-600 hover:text-blue-800 font-medium mb-4">
                    <span class="material-icons text-sm mr-2">arrow_back</span>Back to Trip Details
                </button>
                <div class="bg-white rounded-lg shadow-lg p-8">
                    <h2 class="text-3xl font-bold text-gray-800 mb-6">${formTitle}</h2>
                    
                    <form id="taskForm">
                        <input type="hidden" id="taskTripId" value="${tripId}">
                        ${isEdit ? `<input type="hidden" id="taskId" value="${task.id}">` : ''}
                        
                        <div class="mb-6">
                            <label for="taskTitle" class="block text-sm font-medium text-gray-700 mb-2">Task Title *</label>
                            <input type="text" id="taskTitle" name="title" value="${isEdit ? task.title : ''}" required
                                   class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                                   placeholder="e.g., Pack firewood, Bring sleeping bags">
                        </div>

                        <div class="mb-6">
                            <label for="taskDescription" class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea id="taskDescription" name="description" rows="3"
                                      class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md resize-none"
                                      placeholder="Additional details about this task...">${isEdit && task.description ? task.description : ''}</textarea>
                        </div>

                        <div class="mb-6">
                            <label class="block text-sm font-medium mb-3" style="color: var(--text-primary)">Who should do this task? *</label>
                            <div class="space-y-2">
                                <div class="flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50" 
                                     style="background: var(--bg-secondary); border-color: var(--border-primary);"
                                     onclick="this.querySelector('input').click()">
                                    <input type="radio" name="assignmentType" value="me" ${(!isEdit || task.assignment_type === 'me') ? 'checked' : ''}
                                           class="h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 mr-3"
                                           style="accent-color: var(--ios-blue);">
                                    <div>
                                        <div class="font-medium" style="color: var(--text-primary);">For me</div>
                                        <div class="text-sm" style="color: var(--text-secondary);">I'll take care of this task</div>
                                    </div>
                                </div>
                                
                                <div class="flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50" 
                                     style="background: var(--bg-secondary); border-color: var(--border-primary);"
                                     onclick="this.querySelector('input').click()">
                                    <input type="radio" name="assignmentType" value="everyone" ${(isEdit && task.assignment_type === 'everyone') ? 'checked' : ''}
                                           class="h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 mr-3"
                                           style="accent-color: var(--ios-blue);">
                                    <div>
                                        <div class="font-medium" style="color: var(--text-primary);">For everyone</div>
                                        <div class="text-sm" style="color: var(--text-secondary);">All trip participants should do this</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="mb-6">
                            <div class="flex items-center mb-3">
                                <label class="ios-switch">
                                    <input type="checkbox" id="hasDueDate" name="hasDueDate" ${(isEdit && task.has_due_date) ? 'checked' : ''}>
                                    <span class="ios-switch-slider"></span>
                                </label>
                                <span style="margin-left: 12px; font-size: 16px; color: #1D1D1F;">Set due date</span>
                            </div>
                            <div id="dueDateSection" class="grid grid-cols-1 md:grid-cols-2 gap-4 ${(!isEdit || !task.has_due_date) ? 'hidden' : ''}">
                                <div>
                                    <label for="dueDate" class="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                                    <input type="date" id="dueDate" name="dueDate" 
                                           value="${(isEdit && task.has_due_date && task.due_date) ? task.due_date.split('T')[0] : ''}"
                                           class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md">
                                </div>
                                <div>
                                    <label for="dueTime" class="block text-sm font-medium text-gray-700 mb-2">Due Time</label>
                                    <input type="time" id="dueTime" name="dueTime"
                                           value="${(isEdit && task.has_due_date && task.due_date) ? task.due_date.split('T')[1]?.substring(0, 5) : ''}"
                                           class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md">
                                </div>
                            </div>
                        </div>

                        <div class="flex gap-3">
                            <button type="submit" class="ios-button-primary flex-1">
                                <span class="material-icons mr-2" style="font-size: 16px;">${isEdit ? 'save' : 'add'}</span>${isEdit ? 'Update Task' : 'Create Task'}
                            </button>
                            <button type="button" id="cancelTaskFormBtn" class="ios-button-secondary">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Add event listeners
        document.getElementById('backFromTaskFormBtn').addEventListener('click', () => {
            taskFormSection.classList.add('hidden');
            this.showTripDetails(tripId);
        });

        document.getElementById('cancelTaskFormBtn').addEventListener('click', () => {
            taskFormSection.classList.add('hidden');
            this.showTripDetails(tripId);
        });

        document.getElementById('taskForm').addEventListener('submit', (e) => {
            this.handleTaskSubmit(e, isEdit);
        });

        // Handle assignment type changes for visual feedback
        const assignmentRadios = document.querySelectorAll('input[name="assignmentType"]');
        assignmentRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                // Update visual states for all radio containers
                const radioContainers = document.querySelectorAll('.space-y-2 > div');
                radioContainers.forEach(container => {
                    const radioInput = container.querySelector('input[type="radio"]');
                    if (radioInput && radioInput.checked) {
                        container.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        container.style.borderColor = 'var(--ios-blue)';
                    } else {
                        container.style.backgroundColor = 'var(--bg-secondary)';
                        container.style.borderColor = 'var(--border-primary)';
                    }
                });
            });
        });

        // Handle due date checkbox
        document.getElementById('hasDueDate').addEventListener('change', (e) => {
            const dueDateSection = document.getElementById('dueDateSection');
            if (e.target.checked) {
                dueDateSection.classList.remove('hidden');
            } else {
                dueDateSection.classList.add('hidden');
            }
        });
    }

    async handleTaskSubmit(e, isEdit) {
        e.preventDefault();
        
        const tripId = document.getElementById('taskTripId').value;
        const formData = new FormData(e.target);
        
        // Prepare task data
        const assignmentType = formData.get('assignmentType');
        let assignedToValue = formData.get('assignedTo');
        
        // Fallback: if FormData doesn't capture the dropdown value, get it directly
        if (assignmentType === 'specific' && (!assignedToValue || assignedToValue === '')) {
            const assignedToSelect = document.getElementById('assignedTo');
            if (assignedToSelect) {
                assignedToValue = assignedToSelect.value;
                console.log('Fallback: Got assignedTo value directly from dropdown:', assignedToValue);
            }
        }
        
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            assignmentType: assignmentType,
            assignedTo: null,
            hasDueDate: document.getElementById('hasDueDate').checked,
            dueDate: null
        };

        // Handle assignedTo based on assignment type
        if (assignmentType === 'me') {
            // For "me" assignments, we'll set it to the current user ID (handled by backend)
            taskData.assignedTo = 'me';
        } else if (assignmentType === 'everyone') {
            taskData.assignedTo = null; // Everyone assignment
        }

        // Handle due date/time
        if (taskData.hasDueDate) {
            const dueDate = formData.get('dueDate');
            const dueTime = formData.get('dueTime');
            
            console.log('Due date required, dueDate value:', dueDate);
            if (!dueDate || dueDate === '') {
                this.showMessage('Please select a due date when setting a due date', 'error');
                return;
            }
            
            // Validate date format
            const dateObj = new Date(dueDate);
            if (isNaN(dateObj.getTime())) {
                this.showMessage('Please enter a valid due date', 'error');
                return;
            }
            
            taskData.dueDate = dueTime ? `${dueDate}T${dueTime}:00` : `${dueDate}T23:59:00`;
        }

        try {
            const url = isEdit ? `/api/tasks/${document.getElementById('taskId').value}` : `/api/tasks/trip/${tripId}`;
            const method = isEdit ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(taskData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage(`Task ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
                
                // Hide task form and show trip details
                const taskFormSection = document.getElementById('taskFormSection');
                if (taskFormSection) {
                    taskFormSection.classList.add('hidden');
                }
                
                // Refresh trip details and tasks
                this.showTripDetails(tripId);
                
            } else {
                if (data.errors) {
                    const errorMessages = data.errors.map(err => err.msg).join(', ');
                    this.showMessage(errorMessages, 'error');
                } else {
                    this.showMessage(data.error || `Failed to ${isEdit ? 'update' : 'create'} task`, 'error');
                }
            }
        } catch (error) {
            console.error('Network error:', error);
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    async showEditTaskForm(task) {
        // Get trip details for the form
        try {
            const response = await fetch(`/api/trips/${task.trip_id}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.renderTaskForm(task.trip_id, task, data.trip);
                
                // Scroll to top to show the form
                this.scrollToTop();
            } else {
                this.showMessage('Failed to load trip details', 'error');
            }
        } catch (error) {
            console.error('Error loading trip details:', error);
            this.showMessage('Network error', 'error');
        }
    }

    async loadTripParticipantsForDetail(tripId, organizerId) {
        try {
            const response = await fetch(`/api/trips/${tripId}/participants`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.renderTripParticipantsForDetail(tripId, data.participants, organizerId);
            }
        } catch (error) {
            console.error('Error loading trip participants:', error);
        }
    }

    renderTripParticipantsForDetail(tripId, participants, organizerId) {
        const participantsDiv = document.getElementById(`trip-participants-${tripId}`);
        if (!participantsDiv) return;
        
        if (participants && participants.length > 0) {
            participantsDiv.innerHTML = participants.map(participant => {
                // Handle different participant data formats with proper fallbacks
                let name = 'Unknown User';
                
                if (participant.name && participant.name.trim() && participant.name !== 'undefined undefined') {
                    name = participant.name.trim();
                } else if (participant.first_name || participant.last_name) {
                    const firstName = (participant.first_name || '').trim();
                    const lastName = (participant.last_name || '').trim();
                    if (firstName || lastName) {
                        name = `${firstName} ${lastName}`.trim();
                    }
                } else if (participant.email) {
                    // Use email username as fallback
                    name = participant.email.split('@')[0];
                }
                
                const status = participant.status || 'confirmed';
                const joinedDate = participant.joined_at ? new Date(participant.joined_at).toLocaleDateString() : 'Recently';
                const isOrganizer = organizerId && (participant.user_id === organizerId || participant.id === organizerId);
                
                const userId = participant.user_id || participant.id;
                
                return `
                    <div class="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-opacity-80 transition-all duration-200" 
                         style="background: var(--ios-secondary-grouped-background); border: 1px solid var(--border-secondary);"
                         onclick="app.viewUserProfile(${userId}, '${name.replace(/'/g, "\\'")}')">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background: ${isOrganizer ? 'var(--ios-orange)' : 'var(--ios-blue)'}; opacity: 0.2;">
                            <span class="material-icons" style="font-size: 20px; color: ${isOrganizer ? 'var(--ios-orange)' : 'var(--ios-blue)'};">${isOrganizer ? 'star' : 'person'}</span>
                        </div>
                        <div class="flex-1">
                            <div style="font-weight: 600; color: var(--text-primary); font-size: 16px;">${name}</div>
                            <div style="font-size: 14px; color: var(--text-secondary);">
                                ${isOrganizer ? 
                                    '<span style="color: var(--ios-orange); font-weight: 600;">Organizer</span>' : 
                                    `joined ${joinedDate}`
                                }
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            ${status === 'confirmed' ? 
                                '<span class="material-icons" style="font-size: 18px; color: var(--ios-green);">check_circle</span>' : 
                                '<span class="material-icons" style="font-size: 18px; color: var(--ios-orange);">schedule</span>'
                            }
                            <span class="material-icons" style="font-size: 16px; color: var(--text-secondary);">chevron_right</span>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            participantsDiv.innerHTML = `
                <div class="text-center py-4" style="color: var(--text-secondary);">
                    <span class="material-icons text-2xl mb-2" style="opacity: 0.5; color: var(--text-secondary);">person_add</span>
                    <p class="text-sm">No participants yet</p>
                </div>
            `;
        }
    }

    renderTripParticipants(tripId, participants) {
        const participantsDiv = document.getElementById(`participants-${tripId}`);
        
        if (participants && participants.length > 0) {
            participantsDiv.innerHTML = participants.map(p => `
                <div class="flex items-center">
                    <span class="material-icons text-base mr-2 text-gray-400">account_circle</span>
                    <span>${this.createClickableUsername(p.name, p.user_id)}</span>
                    <span class="text-xs text-gray-400 ml-2">joined ${new Date(p.joined_at).toLocaleDateString()}</span>
                </div>
            `).join('');
        } else {
            participantsDiv.innerHTML = '<p class="text-gray-500 italic">No participants yet</p>';
        }
    }


    async joinTrip(tripId) {
        try {
            const response = await fetch(`/api/trips/${tripId}/join`, {
                method: 'POST',
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage('Successfully joined the trip!', 'success');
                this.loadMyTrips(); // Refresh trips list
                if (this.allTrips) {
                    this.loadAllTrips(); // Also refresh all trips if showing
                }
            } else {
                this.showMessage(data.error || 'Failed to join trip', 'error');
            }
        } catch (error) {
            console.error('Error joining trip:', error);
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    async leaveTrip(tripId) {
        if (!confirm('Are you sure you want to leave this trip?')) {
            return;
        }

        try {
            const response = await fetch(`/api/trips/${tripId}/leave`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage('Successfully left the trip', 'success');
                this.loadMyTrips(); // Refresh trips list
                if (this.allTrips) {
                    this.loadAllTrips(); // Also refresh all trips if showing
                }
            } else {
                this.showMessage(data.error || 'Failed to leave trip', 'error');
            }
        } catch (error) {
            console.error('Error leaving trip:', error);
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    initPlacesAutocomplete() {
        if (!window.google || !window.google.maps || !window.google.maps.places) {
            console.log('Google Places API not available - using fallback geocoding');
            this.initFallbackAddressLookup();
            return;
        }

        console.log('Initializing Google Places autocomplete');
        
        // Initialize autocomplete for trip location inputs
        const locationInputs = [
            'modalTripLocation',  // Modal form
            'tripLocation'        // Main form (if exists)
        ];

        locationInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input && !input.autocomplete) {
                try {
                    const autocomplete = new google.maps.places.Autocomplete(input, {
                        types: ['establishment', 'geocode'],
                        componentRestrictions: { country: ['us', 'ca'] },
                        fields: ['place_id', 'geometry', 'name', 'formatted_address']
                    });

                    autocomplete.addListener('place_changed', () => {
                        const place = autocomplete.getPlace();
                        if (place.geometry) {
                            console.log('Place selected:', place.name, place.geometry.location.lat(), place.geometry.location.lng());
                            // Store coordinates for weather integration
                            input.dataset.lat = place.geometry.location.lat();
                            input.dataset.lng = place.geometry.location.lng();
                        }
                    });

                    input.autocomplete = autocomplete;
                } catch (error) {
                    console.error('Error initializing Places autocomplete:', error);
                    this.initFallbackAddressLookup();
                }
            }
        });
    }

    initFallbackAddressLookup() {
        console.log('Initializing fallback address lookup with basic geocoding');
        const locationInputs = ['modalTripLocation', 'tripLocation'];
        
        locationInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.placeholder = 'Enter camping location (e.g., Yosemite National Park, CA)';
                
                // Add basic address validation and geocoding on blur
                input.addEventListener('blur', async () => {
                    const address = input.value.trim();
                    if (address && address.length > 3) {
                        try {
                            // Use a simple geocoding service (Nominatim - free OpenStreetMap service)
                            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=us,ca`);
                            const data = await response.json();
                            
                            if (data && data.length > 0) {
                                const result = data[0];
                                input.dataset.lat = result.lat;
                                input.dataset.lng = result.lon;
                                input.value = result.display_name;
                                console.log('Geocoded address:', result.display_name);
                            }
                        } catch (error) {
                            console.log('Geocoding failed, using manual entry:', error.message);
                        }
                    }
                });
            }
        });
    }

    // Confirm trip deletion with modal
    confirmDeleteTrip(tripId, tripTitle) {
        this.modalTitle.textContent = 'Delete Trip';
        this.modalBody.innerHTML = `
            <div class="text-center py-6">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <span class="material-icons text-red-600">warning</span>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Delete "${tripTitle}"?</h3>
                <p class="text-sm text-gray-500 mb-6">
                    This action cannot be undone. All tasks, shopping items, and other trip data will be permanently deleted.
                </p>
                <div class="flex flex-col gap-3">
                    <button id="confirmDeleteBtn" class="ios-button-primary" 
                            style="background: linear-gradient(135deg, #FF3B30 0%, #DC3545 100%);">
                        <span class="material-icons mr-2" style="font-size: 16px;">delete_forever</span>
                        Delete Trip
                    </button>
                    <button id="cancelDeleteBtn" class="ios-button-secondary">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        this.modalOverlay.classList.add('show');
        
        // Add event listeners
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            this.deleteTrip(tripId);
        });
        
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
            this.closeModal();
        });
    }

    // Delete trip
    async deleteTrip(tripId) {
        try {
            const response = await fetch(`/api/trips/${tripId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                this.showMessage('Trip deleted successfully', 'success');
                this.closeModal();
                
                // Remove trip from local data
                this.myTrips = this.myTrips.filter(trip => trip.id !== tripId);
                
                // Refresh the trips view
                this.showMyTrips();
                
                // If we're currently viewing this trip's details, go back to trips
                const detailsSection = document.getElementById('tripDetailsSection');
                if (detailsSection && !detailsSection.classList.contains('hidden')) {
                    this.showMyTrips();
                }
            } else {
                const data = await response.json();
                this.showMessage(data.error || 'Failed to delete trip', 'error');
            }
        } catch (error) {
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    // Helper method to create iOS switch
    createIOSSwitch(id, checked = false, label = '') {
        return `
            <label class="ios-switch">
                <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
                <span class="ios-switch-slider"></span>
            </label>
            ${label ? `<span style="margin-left: 12px; font-size: 16px; color: #1D1D1F;">${label}</span>` : ''}
        `;
    }

    // Helper method to create mobile-optimized buttons
    createMobileButton(text, type = 'primary', onclick = '', icon = '') {
        const iconHtml = icon ? `<span class="material-icons" style="font-size: 18px;">${icon}</span>` : '';
        return `
            <button class="ios-button-${type}" onclick="${onclick}" type="button">
                ${iconHtml}
                ${text}
            </button>
        `;
    }

    // Helper method to make buttons mobile-friendly
    optimizeButtonsForMobile() {
        // Add mobile classes to existing buttons
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            if (window.innerWidth <= 768) {
                if (button.classList.contains('ios-button-primary') || 
                    button.classList.contains('ios-button-secondary')) {
                    button.style.width = '100%';
                    button.style.marginBottom = '12px';
                }
            }
        });
    }

    // Initialize responsive button visibility
    initializeResponsiveButtons() {
        this.updateResponsiveButtons();
        
        // Update on window resize
        window.addEventListener('resize', () => {
            this.updateResponsiveButtons();
        });
    }

    // Update button visibility based on screen size
    updateResponsiveButtons() {
        const isMobile = window.innerWidth <= 768;
        
        // Desktop buttons (show on desktop, hide on mobile)
        const desktopButtons = document.querySelectorAll('[data-desktop-button="true"]');
        desktopButtons.forEach(button => {
            button.style.display = isMobile ? 'none' : 'flex';
        });
        
        // Mobile buttons (show on mobile, hide on desktop)
        const mobileButtons = document.querySelectorAll('[data-mobile-button="true"]');
        mobileButtons.forEach(button => {
            button.style.display = isMobile ? 'block' : 'none';
        });
    }
}

// Google Places API initialization callback
window.initGooglePlaces = function() {
    console.log('Google Places API loaded');
    if (window.app) {
        window.app.initPlacesAutocomplete();
    }
};

// Global app instance for onclick handlers
let app;

// iOS toggle switch function
window.togglePublicTrip = function() {
    const checkbox = document.getElementById('modalIsPublic');
    const toggleSwitch = document.getElementById('publicSwitch');
    const thumb = toggleSwitch.querySelector('div');
    
    // Toggle the hidden checkbox
    checkbox.checked = !checkbox.checked;
    
    // Update visual state of the switch
    if (checkbox.checked) {
        toggleSwitch.style.background = '#34C759'; // iOS green
        thumb.style.transform = 'translateX(20px)';
    } else {
        toggleSwitch.style.background = '#E5E5EA'; // iOS gray
        thumb.style.transform = 'translateX(0px)';
    }
    
    // Trigger the existing public/private toggle logic
    if (window.app) {
        const tripCodeSection = document.getElementById('modalTripCodeSection');
        if (checkbox.checked) {
            tripCodeSection.style.display = 'none';
        } else {
            tripCodeSection.style.display = 'block';
            window.app.generateTripCode('modalGeneratedTripCode');
        }
    }
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CampingApp();
    app = window.app; // For onclick handlers
    
    // Initialize Places API if already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
        window.app.initPlacesAutocomplete();
    }
    
    // Optimize buttons for mobile
    window.app.optimizeButtonsForMobile();
    
    // Re-optimize on window resize
    window.addEventListener('resize', () => {
        window.app.optimizeButtonsForMobile();
    });
});
