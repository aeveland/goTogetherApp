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
        document.getElementById('joinTripBtn').addEventListener('click', () => this.showJoinTripsView());
        document.getElementById('browseTripsBtn').addEventListener('click', () => this.showBrowseTripsView());
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
            // Load all user's trips and tasks in parallel
            await Promise.all([
                this.loadMyTrips(),
                this.loadDashboardTasks(),
                this.loadDashboardShopping(),
                this.loadTripStatistics()
            ]);
            
            // Update dashboard sections
            this.updateDashboardUpcomingTrips();
            this.updateRecentActivity();
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
                console.error('Failed to load user tasks');
            }
        } catch (error) {
            console.error('Error loading user tasks:', error);
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

        // Show pending tasks only
        const pendingTasks = this.userTasks.filter(task => !task.is_completed);
        taskCount.textContent = pendingTasks.length;

        if (pendingTasks.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <span class="material-icons text-4xl mb-2 opacity-50" style="color: var(--ios-green);">check_circle</span>
                    <p class="ios-callout">All tasks completed! 🎉</p>
                </div>
            `;
            return;
        }

        // Show up to 5 most urgent tasks
        const tasksToShow = pendingTasks.slice(0, 5);
        
        container.innerHTML = tasksToShow.map(task => {
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
                            class="ml-3 p-2 rounded-full hover:bg-gray-200 transition-colors">
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
                <div class="flex items-center justify-between p-4 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
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

        shoppingCount.textContent = this.userShoppingAssignments.length;

        // Show up to 5 most urgent shopping items
        const itemsToShow = this.userShoppingAssignments.slice(0, 5);
        
        container.innerHTML = itemsToShow.map(item => {
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
                            class="ml-3 p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <span class="material-icons text-gray-400">radio_button_unchecked</span>
                    </button>
                </div>
            `;
        }).join('');

        if (this.userShoppingAssignments.length > 5) {
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
        
        // Update count badge
        if (countBadge) {
            countBadge.textContent = items ? items.length : 0;
        }
        
        // Create dietary restrictions summary
        let dietaryInfo = '';
        if (dietaryRestrictions && dietaryRestrictions.length > 0) {
            const restrictionsList = dietaryRestrictions.map(person => 
                `<span class="inline-block px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 mr-1 mb-1">
                    ${person.first_name}: ${person.dietary_restrictions}
                </span>`
            ).join('');
            
            dietaryInfo = `
                <div class="mb-4 p-3 rounded-lg" style="background: var(--ios-orange-light, #FFF3E0); border: 1px solid var(--ios-orange, #FF9500);">
                    <div class="flex items-center mb-2">
                        <span class="material-icons mr-2 text-orange-600" style="font-size: 18px;">restaurant_menu</span>
                        <span class="ios-footnote font-medium text-orange-800">Dietary Restrictions to Consider</span>
                    </div>
                    <div class="flex flex-wrap">
                        ${restrictionsList}
                    </div>
                </div>
            `;
        }
        
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
                                    class="p-2 rounded-full hover:bg-gray-200 transition-colors">
                                <span class="material-icons ${isCompleted ? 'text-green-600' : 'text-gray-400'}">
                                    ${isCompleted ? 'check_circle' : 'radio_button_unchecked'}
                                </span>
                            </button>
                            <button onclick="app.editShoppingItem(${item.id})" 
                                    class="p-2 rounded-full hover:bg-gray-200 transition-colors">
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
        
        container.innerHTML = dietaryInfo + html;
    }

    async loadTripWeather(tripId) {
        try {
            const response = await fetch(`/api/weather/trip/${tripId}/forecast`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.renderTripWeather(tripId, data);
            } else {
                console.error('Failed to load weather forecast');
                this.renderWeatherError(tripId);
            }
        } catch (error) {
            console.error('Error loading weather forecast:', error);
            this.renderWeatherError(tripId);
        }
    }

    renderWeatherError(tripId) {
        const container = document.getElementById(`weatherForecast-${tripId}`);
        if (container) {
            container.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    <span class="material-icons text-2xl mb-2 opacity-50">cloud_off</span>
                    <p class="ios-footnote">Weather forecast unavailable</p>
                    <p class="ios-caption text-gray-400">Check your internet connection</p>
                </div>
            `;
        }
    }

    renderTripWeather(tripId, weatherData) {
        const container = document.getElementById(`weatherForecast-${tripId}`);
        if (!container) return;

        // Current weather
        const current = weatherData.current;
        const currentTemp = Math.round(current.temp);
        const feelsLike = Math.round(current.feels_like);
        
        // 7-day forecast
        const daily = weatherData.daily.slice(1, 8); // Skip today, show next 7 days
        
        // Weather alerts
        const alerts = weatherData.weather_alerts || [];
        
        // Packing suggestions
        const packingSuggestions = weatherData.packing_suggestions || [];

        let alertsHtml = '';
        if (alerts.length > 0) {
            alertsHtml = `
                <div class="mb-4 p-3 rounded-lg" style="background: #FFF3E0; border: 1px solid #FF9500;">
                    <div class="flex items-center mb-2">
                        <span class="material-icons mr-2 text-orange-600" style="font-size: 16px;">warning</span>
                        <span class="ios-footnote font-medium text-orange-800">Weather Alerts</span>
                    </div>
                    <div class="space-y-1">
                        ${alerts.map(alert => `
                            <div class="flex items-center text-sm text-orange-700">
                                <span class="material-icons mr-2" style="font-size: 14px;">${alert.icon}</span>
                                <span>${alert.day}: ${alert.message}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        let packingHtml = '';
        if (packingSuggestions.length > 0) {
            packingHtml = `
                <div class="mb-4 p-3 rounded-lg" style="background: var(--ios-blue-light, #E3F2FD); border: 1px solid var(--ios-blue, #007AFF);">
                    <div class="flex items-center mb-2">
                        <span class="material-icons mr-2 text-blue-600" style="font-size: 16px;">backpack</span>
                        <span class="ios-footnote font-medium text-blue-800">Packing Suggestions</span>
                    </div>
                    <div class="space-y-1">
                        ${packingSuggestions.slice(0, 3).map(suggestion => `
                            <div class="flex items-center text-sm text-blue-700">
                                <span class="material-icons mr-2" style="font-size: 14px;">${suggestion.icon}</span>
                                <span><strong>${suggestion.item}:</strong> ${suggestion.reason}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Historical comparison
        let historicalHtml = '';
        if (weatherData.historical && weatherData.historical.data && weatherData.historical.data.length > 0) {
            const historicalTemp = Math.round(weatherData.historical.data[0].temp);
            const tempDiff = currentTemp - historicalTemp;
            if (Math.abs(tempDiff) > 5) {
                historicalHtml = `
                    <div class="mb-4 p-2 rounded text-center text-sm" style="background: var(--ios-gray-6);">
                        <span class="material-icons mr-1" style="font-size: 14px;">history</span>
                        Last year: ${historicalTemp}°F (${tempDiff > 0 ? '+' : ''}${Math.round(tempDiff)}°F difference)
                    </div>
                `;
            }
        }

        container.innerHTML = `
            ${alertsHtml}
            ${packingHtml}
            
            <!-- Current Weather -->
            <div class="mb-4 p-4 rounded-lg text-center" style="background: var(--ios-gray-6);">
                <div class="flex items-center justify-center mb-2">
                    <span class="material-icons mr-2 text-2xl">${this.getWeatherIcon(current.weather[0].main)}</span>
                    <div>
                        <div class="ios-title-2">${currentTemp}°F</div>
                        <div class="ios-footnote text-gray-600">Feels like ${feelsLike}°F</div>
                    </div>
                </div>
                <div class="ios-callout">${current.weather[0].description}</div>
                ${historicalHtml}
            </div>

            <!-- 7-Day Forecast -->
            <div class="grid grid-cols-7 gap-2">
                ${daily.map(day => {
                    const date = new Date(day.dt * 1000);
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    const high = Math.round(day.temp.max);
                    const low = Math.round(day.temp.min);
                    const rainChance = Math.round(day.pop * 100);
                    
                    return `
                        <div class="text-center p-2 rounded" style="background: var(--ios-gray-6);">
                            <div class="ios-caption font-medium mb-1">${dayName}</div>
                            <span class="material-icons text-lg mb-1">${this.getWeatherIcon(day.weather[0].main)}</span>
                            <div class="ios-caption">
                                <div class="font-medium">${high}°</div>
                                <div class="text-gray-500">${low}°</div>
                                ${rainChance > 20 ? `<div class="text-blue-600">${rainChance}%</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        // Add refresh button event listener
        const refreshBtn = document.getElementById(`refreshWeatherBtn-${tripId}`);
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
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
                // Reload shopping data
                this.loadDashboardShopping();
                // If we're on a trip details page, reload that too
                const currentTripId = this.getCurrentTripId();
                if (currentTripId) {
                    this.loadTripShopping(currentTripId);
                }
            } else {
                this.showMessage('Failed to update shopping item', 'error');
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
                    <label class="flex items-center gap-3">
                        <input type="checkbox" id="modalIsPublic" name="isPublic" 
                               class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                        <span>Make this trip public (others can find and join)</span>
                    </label>
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
        
        // Focus first input
        setTimeout(() => {
            document.getElementById('modalTripTitle').focus();
        }, 100);
    }

    async handleModalCreateTrip(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const isPublic = formData.has('isPublic');
        const tripCode = isPublic ? null : document.getElementById('modalGeneratedTripCode').textContent;
        
        const tripData = {
            title: formData.get('title'),
            location: formData.get('location'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            tripType: formData.get('tripType'),
            description: formData.get('description'),
            isPublic: isPublic,
            tripCode: tripCode
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
                        <label class="flex items-center gap-3">
                            <input type="checkbox" id="modalHasDueDate" 
                                   class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <span>Set due date</span>
                        </label>
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
        
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            assignedTo: formData.get('assignedTo'),
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

    async showAddShoppingModal(tripId) {
        // Get shopping categories and dietary restrictions
        try {
            const [categoriesResponse, shoppingResponse] = await Promise.all([
                fetch('/api/shopping/categories', { credentials: 'include' }),
                fetch(`/api/shopping/trip/${tripId}`, { credentials: 'include' })
            ]);

            let categories = [];
            let dietaryRestrictions = [];
            
            if (categoriesResponse.ok) {
                const data = await categoriesResponse.json();
                categories = data.categories || [];
            }
            
            if (shoppingResponse.ok) {
                const data = await shoppingResponse.json();
                dietaryRestrictions = data.dietary_restrictions || [];
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
                               placeholder="Enter item name">
                    </div>
                    
                    <div class="form-group">
                        <label for="modalItemDescription">Description</label>
                        <textarea id="modalItemDescription" name="description" rows="2"
                                  placeholder="Additional details about the item"></textarea>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="form-group">
                            <label for="modalItemCategory">Category</label>
                            <select id="modalItemCategory" name="category">
                                ${categories.map(cat => `
                                    <option value="${cat.name}">${cat.name}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="modalItemQuantity">Quantity</label>
                            <input type="number" id="modalItemQuantity" name="quantity" 
                                   min="1" value="1" placeholder="1">
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="form-group">
                            <label for="modalItemCost">Estimated Cost ($)</label>
                            <input type="number" id="modalItemCost" name="estimatedCost" 
                                   step="0.01" min="0" placeholder="0.00">
                        </div>
                        <div class="form-group">
                            <label for="modalItemPriority">Priority</label>
                            <select id="modalItemPriority" name="priority">
                                <option value="medium" selected>Medium</option>
                                <option value="high">High</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="modalItemAssignment">Assign To</label>
                        <select id="modalItemAssignment" name="assignedTo">
                            <option value="anyone" selected>Anyone can buy this</option>
                            <option value="everyone">Everyone should buy this</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="modalItemNotes">Notes</label>
                        <textarea id="modalItemNotes" name="notes" rows="2"
                                  placeholder="Special instructions, brand preferences, etc."></textarea>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="submit" class="ios-button-primary flex-1">
                            <span class="material-icons mr-2" style="font-size: 16px;">add_shopping_cart</span>Add Item
                        </button>
                        <button type="button" onclick="app.closeModal()" class="ios-button-secondary">
                            Cancel
                        </button>
                    </div>
                </form>
            `;
            
            this.showModal('Add Shopping Item', modalContent);
            
            // Handle form submission
            document.getElementById('modalAddShoppingForm').addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleModalAddShopping(e, tripId);
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

    async handleModalAddShopping(e, tripId) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const shoppingData = {
            item_name: formData.get('itemName'),
            description: formData.get('description'),
            category: formData.get('category'),
            quantity: parseInt(formData.get('quantity')) || 1,
            estimated_cost: parseFloat(formData.get('estimatedCost')) || null,
            priority: formData.get('priority'),
            assigned_to: formData.get('assignedTo'),
            notes: formData.get('notes')
        };

        try {
            const response = await fetch(`/api/shopping/trip/${tripId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(shoppingData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage('Shopping item added successfully!', 'success');
                this.closeModal();
                this.loadTripShopping(tripId);
                this.loadDashboardShopping(); // Refresh dashboard
            } else {
                if (data.errors) {
                    const errorMessages = data.errors.map(err => err.msg).join(', ');
                    this.showMessage(errorMessages, 'error');
                } else {
                    this.showMessage(data.error || 'Failed to add shopping item', 'error');
                }
            }
        } catch (error) {
            console.error('Error adding shopping item:', error);
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
                this.showMessage('Login successful!', 'success');
                this.showDashboard(data.user);
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
                this.showAuthForms();
                this.clearForms();
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
            // Create map container if it doesn't exist
            const container = document.getElementById(containerId);
            if (!container) return null;

            // Clear any existing map
            container.innerHTML = '';
            
            // Create map
            const map = L.map(containerId, {
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

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: ''
            }).addTo(map);

            // Add marker
            L.marker([lat, lon]).addTo(map)
                .bindPopup(location);

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

            container.innerHTML = '';
            
            const map = L.map(containerId, {
                center: [lat, lon],
                zoom: 12
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            L.marker([lat, lon]).addTo(map)
                .bindPopup(`<b>${location}</b>`)
                .openPopup();

            return map;
        } catch (error) {
            console.log('Full map creation error:', error);
            return null;
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
                this.displayProfile(data.user, data.isOwnProfile);
            } else {
                this.showMessage('Failed to load profile', 'error');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showMessage('Error loading profile', 'error');
        }
    }
    
    displayProfile(user, isOwnProfile) {
        // Create a simple profile display that works
        const profileHTML = `
            <div style="max-width: 800px; margin: 0 auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                    <h1 style="font-size: 28px; font-weight: bold; color: #333;">${user.first_name} ${user.last_name}</h1>
                    <div>
                        ${isOwnProfile ? '<button onclick="app.showEditProfile()" style="background: #3b82f6; color: white; padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; margin-right: 10px;">Edit Profile</button>' : ''}
                        <button onclick="app.showMyTripsView()" style="background: #6b7280; color: white; padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer;">Back to Dashboard</button>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                    <div>
                        <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #374151;">Personal Information</h3>
                        <div style="space-y: 10px;">
                            <div style="margin-bottom: 10px;">
                                <label style="font-size: 14px; font-weight: 500; color: #6b7280;">Name</label>
                                <p style="font-weight: 500; color: #111827;">${user.first_name} ${user.last_name}</p>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label style="font-size: 14px; font-weight: 500; color: #6b7280;">Bio</label>
                                <p style="color: #111827;">${user.bio || 'No bio provided'}</p>
                            </div>
                            ${isOwnProfile ? `
                            <div style="margin-bottom: 10px;">
                                <label style="font-size: 14px; font-weight: 500; color: #6b7280;">Phone</label>
                                <p style="color: #111827;">${user.phone || 'Not provided'}</p>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label style="font-size: 14px; font-weight: 500; color: #6b7280;">Home Address</label>
                                ${this.getAddressDisplay(user)}
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div>
                        <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #374151;">Camping Style</h3>
                        <div style="space-y: 10px;">
                            <div style="margin-bottom: 10px;">
                                <label style="font-size: 14px; font-weight: 500; color: #6b7280;">Camper Type</label>
                                <p style="color: #111827;">${this.getCamperTypeDisplay(user.camper_type)}</p>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label style="font-size: 14px; font-weight: 500; color: #6b7280;">Group Size</label>
                                <p style="color: #111827;">${user.group_size ? `${user.group_size} ${user.group_size === 1 ? 'person' : 'people'}` : 'Not specified'}</p>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label style="font-size: 14px; font-weight: 500; color: #6b7280;">Dietary Restrictions</label>
                                <p style="color: #111827;">${this.getDietaryDisplay(user.dietary_restrictions)}</p>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label style="font-size: 14px; font-weight: 500; color: #6b7280;">Member Since</label>
                                <p style="color: #111827;">${new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
                            </div>
                        </div>
                    </div>
                </div>
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
            profileContainer.style.cssText = 'padding: 20px; background: #f9fafb; min-height: 100vh;';
            document.body.appendChild(profileContainer);
        }
        
        profileContainer.innerHTML = profileHTML;
        profileContainer.style.display = 'block';
        
        // Event handlers are now inline in the HTML
        
        this.currentProfileUser = user;
        this.isOwnProfile = isOwnProfile;
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

    getAddressDisplay(user) {
        if (!user.home_address && !user.home_city) {
            return '<p style="color: #111827;">Not provided</p>';
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

        const fullAddress = addressParts.join('<br>');
        
        // Create "Open in Maps" link if we have coordinates or a full address
        let mapsLink = '';
        if (user.home_latitude && user.home_longitude) {
            mapsLink = `https://maps.apple.com/?q=${user.home_latitude},${user.home_longitude}`;
        } else if (addressParts.length > 0) {
            const searchAddress = addressParts.join(', ').replace(/<br>/g, ', ');
            mapsLink = `https://maps.apple.com/?q=${encodeURIComponent(searchAddress)}`;
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
        const user = this.currentProfileUser;
        
        const editHTML = `
            <div style="max-width: 800px; margin: 0 auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                    <h1 style="font-size: 28px; font-weight: bold; color: #333;">Edit Profile</h1>
                    <button onclick="app.displayProfile(app.currentProfileUser, app.isOwnProfile)" style="background: #6b7280; color: white; padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer;">Cancel</button>
                </div>
                
                <form onsubmit="app.handleUpdateProfile(event)" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                    <div>
                        <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #374151;">Personal Information</h3>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 5px;">First Name</label>
                            <input type="text" name="firstName" value="${user.first_name || ''}" required
                                   style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 5px;">Last Name</label>
                            <input type="text" name="lastName" value="${user.last_name || ''}" required
                                   style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 5px;">Bio</label>
                            <textarea name="bio" rows="3" placeholder="Tell others about your camping experience..."
                                      style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; resize: vertical;">${user.bio || ''}</textarea>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 5px;">Phone</label>
                            <input type="tel" name="phone" value="${user.phone || ''}" placeholder="(555) 123-4567"
                                   style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 5px;">Home Address</label>
                            <input type="text" id="homeAddressInput" name="homeAddress" value="${user.home_address || ''}" 
                                   placeholder="123 Main Street"
                                   style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                            <div>
                                <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 5px;">City</label>
                                <input type="text" name="homeCity" value="${user.home_city || ''}" placeholder="City"
                                       style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 5px;">State</label>
                                <input type="text" name="homeState" value="${user.home_state || ''}" placeholder="State"
                                       style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 5px;">ZIP</label>
                                <input type="text" name="homeZip" value="${user.home_zip || ''}" placeholder="12345"
                                       style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #374151;">Camping Preferences</h3>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 5px;">Camper Type</label>
                            <select name="camperType" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                                <option value="">Select camper type...</option>
                                <option value="tent" ${user.camper_type === 'tent' ? 'selected' : ''}>Tent Camping</option>
                                <option value="trailer" ${user.camper_type === 'trailer' ? 'selected' : ''}>Travel Trailer</option>
                                <option value="rv" ${user.camper_type === 'rv' ? 'selected' : ''}>RV/Motorhome</option>
                                <option value="van" ${user.camper_type === 'van' ? 'selected' : ''}>Van/Camper Van</option>
                                <option value="fifth_wheel" ${user.camper_type === 'fifth_wheel' ? 'selected' : ''}>5th Wheel</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 5px;">Group Size</label>
                            <input type="number" name="groupSize" value="${user.group_size || 1}" min="1" max="20"
                                   style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 5px;">Dietary Restrictions</label>
                            <select name="dietaryRestrictions" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                                <option value="">None</option>
                                <option value="vegetarian" ${user.dietary_restrictions === 'vegetarian' ? 'selected' : ''}>Vegetarian</option>
                                <option value="vegan" ${user.dietary_restrictions === 'vegan' ? 'selected' : ''}>Vegan</option>
                                <option value="gluten_free" ${user.dietary_restrictions === 'gluten_free' ? 'selected' : ''}>Gluten-Free</option>
                                <option value="dairy_free" ${user.dietary_restrictions === 'dairy_free' ? 'selected' : ''}>Dairy-Free</option>
                                <option value="nut_allergy" ${user.dietary_restrictions === 'nut_allergy' ? 'selected' : ''}>Nut Allergy</option>
                                <option value="kosher" ${user.dietary_restrictions === 'kosher' ? 'selected' : ''}>Kosher</option>
                                <option value="halal" ${user.dietary_restrictions === 'halal' ? 'selected' : ''}>Halal</option>
                                <option value="other" ${user.dietary_restrictions === 'other' ? 'selected' : ''}>Other</option>
                            </select>
                        </div>
                        
                        <div style="margin-top: 30px;">
                            <button type="submit" id="saveProfileBtn" 
                                    style="background: #10b981; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-right: 10px;">
                                Save Changes
                            </button>
                            <button type="button" onclick="app.displayProfile(app.currentProfileUser, app.isOwnProfile)" 
                                    style="background: #6b7280; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        `;
        
        const profileContainer = document.getElementById('simpleProfileContainer');
        profileContainer.innerHTML = editHTML;
        
        // Form submission handler is now inline
    }
    
    showProfileView() {
        document.getElementById('profileEditForm').style.display = 'none';
        document.getElementById('profileView').style.display = 'block';
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

    handleJoinByCode() {
        const tripCode = document.getElementById('tripCode').value.trim();
        if (!tripCode) {
            this.showMessage('Please enter a trip code', 'error');
            return;
        }
        
        // TODO: Implement join by code functionality
        this.showMessage('Join by code feature coming soon!', 'info');
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
                        ${trip.difficulty_level ? `
                            <div class="flex gap-2 flex-shrink-0">
                                <span class="px-3 py-1 text-xs rounded-full font-medium" style="background: var(--ios-gray-6); color: var(--ios-secondary-label);">
                                    ${trip.difficulty_level}
                                </span>
                            </div>
                        ` : ''}
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
                        <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
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
                            <span>Organized by ${trip.organizer_name}</span>
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
                        <div class="bg-blue-100 text-blue-800 px-4 py-2 rounded-md">
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
        
        // Hide dashboard title and main action buttons when viewing trip details
        const dashboardTitle = document.getElementById('dashboardTitle');
        if (dashboardTitle) {
            dashboardTitle.style.display = 'none';
        }
        
        const mainActionButtons = document.getElementById('mainActionButtons');
        if (mainActionButtons) {
            mainActionButtons.style.display = 'none';
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
            <!-- Trip Header with Key Actions -->
            <div class="ios-card mb-6">
                <div class="p-6">
                    <button id="backFromDetailsBtn" class="ios-button-secondary ios-button-compact mb-4">
                        <span class="material-icons mr-2" style="font-size: 16px;">arrow_back</span>Back to Trips
                    </button>
                    
                    <div class="flex justify-between items-start mb-6">
                        <div class="flex-1 min-w-0">
                            <h1 class="ios-title-1 mb-2">${trip.title}</h1>
                            <p class="ios-callout text-gray-600 mb-3">${trip.location}</p>
                            <div class="flex items-center gap-4 text-sm text-gray-500">
                                <span class="flex items-center">
                                    <span class="material-icons mr-1" style="font-size: 16px;">event</span>
                                    ${startDate} - ${endDate}
                                </span>
                                <span class="flex items-center">
                                    <span class="material-icons mr-1" style="font-size: 16px;">group</span>
                                    ${trip.current_participants}/${trip.max_participants} joined
                                </span>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2 ml-4">
                            <span class="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800 flex items-center">
                                <span class="material-icons text-sm mr-1">${typeIcons[trip.trip_type]}</span>
                                ${trip.trip_type.replace('_', ' ')}
                            </span>
                            ${isOrganizer ? `
                                <button id="editTripBtn-${trip.id}" data-trip-id="${trip.id}" 
                                        class="ios-button-secondary ios-button-compact">
                                    <span class="material-icons mr-1" style="font-size: 14px;">edit</span>Edit
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Quick Action Buttons -->
                    <div class="grid grid-cols-2 gap-3 mb-4">
                        <button id="addTaskBtn-${trip.id}" data-trip-id="${trip.id}"
                                class="ios-button-primary flex items-center justify-center py-4">
                            <span class="material-icons mr-2" style="font-size: 20px;">add_task</span>
                            <span class="font-medium">Add Task</span>
                        </button>
                        <button id="addShoppingItemBtn-${trip.id}" data-trip-id="${trip.id}"
                                class="ios-button-primary flex items-center justify-center py-4" 
                                style="background: var(--ios-purple);">
                            <span class="material-icons mr-2" style="font-size: 20px;">add_shopping_cart</span>
                            <span class="font-medium">Add Item</span>
                        </button>
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
                            <span id="tripTaskCount-${trip.id}" class="px-3 py-1 rounded-full text-sm font-medium" 
                                  style="background: var(--ios-blue); color: white;">0</span>
                        </div>
                        <div id="tasksList-${trip.id}" class="space-y-3">
                            <!-- Tasks will be loaded here -->
                        </div>
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
                            <span id="tripShoppingCount-${trip.id}" class="px-3 py-1 rounded-full text-sm font-medium" 
                                  style="background: var(--ios-purple); color: white;">0</span>
                        </div>
                        <div id="shoppingList-${trip.id}" class="space-y-3">
                            <!-- Shopping items will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Weather Forecast -->
            <div class="ios-card mb-6">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="ios-title-3 flex items-center">
                            <span class="material-icons mr-3" style="font-size: 24px; color: var(--ios-blue);">wb_sunny</span>
                            Weather Forecast
                        </h3>
                        <button id="refreshWeatherBtn-${trip.id}" data-trip-id="${trip.id}" 
                                class="ios-button-secondary ios-button-compact">
                            <span class="material-icons mr-1" style="font-size: 14px;">refresh</span>Refresh
                        </button>
                    </div>
                    <div id="weatherForecast-${trip.id}">
                        <div class="text-center py-4 text-gray-500">
                            <span class="material-icons text-2xl mb-2 opacity-50">cloud</span>
                            <p class="ios-footnote">Loading weather forecast...</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Trip Details (Collapsible) -->
            <div class="ios-card mb-6">
                <div class="p-6">
                    <button id="toggleTripDetails" class="w-full flex items-center justify-between text-left ios-callout font-medium text-gray-700 hover:text-gray-900 transition-colors">
                        <span class="flex items-center">
                            <span class="material-icons mr-3" style="font-size: 20px;">info</span>
                            Trip Details & Map
                        </span>
                        <span class="material-icons transition-transform" id="detailsChevron">expand_more</span>
                    </button>
                    
                    <div id="tripDetailsContent" class="hidden mt-6">
                        ${trip.description ? `
                            <div class="mb-6">
                                <h4 class="ios-callout font-medium text-gray-800 mb-2">Description</h4>
                                <p class="ios-footnote text-gray-600 leading-relaxed">${trip.description}</p>
                            </div>
                        ` : ''}

                        <!-- Location Map -->
                        <div class="mb-6">
                            <h4 class="ios-callout font-medium text-gray-800 mb-3">Location</h4>
                            <div id="trip-detail-map" style="height: 250px; width: 100%; border-radius: 12px; background: var(--ios-gray-6);"></div>
                        </div>

                        ${trip.participants && trip.participants.length > 0 ? `
                            <div class="mb-6">
                                <h4 class="ios-callout font-medium text-gray-800 mb-3">Who's Going (${trip.participants.length})</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    ${trip.participants.map(p => `
                                        <div class="flex items-center p-3 rounded-lg" style="background: var(--ios-gray-6);">
                                            <span class="material-icons text-xl text-gray-400 mr-3">account_circle</span>
                                            <div>
                                                <div class="ios-footnote font-medium text-gray-800">${p.name}</div>
                                                <div class="ios-caption text-gray-500">joined ${new Date(p.joined_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
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

        // Add task button event listener
        const addTaskBtn = document.getElementById(`addTaskBtn-${trip.id}`);
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => {
                this.showAddTaskModal(trip.id);
            });
        }

        // Add shopping item button event listener
        const addShoppingBtn = document.getElementById(`addShoppingItemBtn-${trip.id}`);
        if (addShoppingBtn) {
            addShoppingBtn.addEventListener('click', () => {
                this.showAddShoppingModal(trip.id);
            });
        }

        // Load tasks, shopping items, and weather for this trip
        this.loadTripTasks(trip.id);
        this.loadTripShopping(trip.id);
        this.loadTripWeather(trip.id);

        // Initialize full map for trip location
        setTimeout(async () => {
            const coords = await this.geocodeLocation(trip.location);
            if (coords) {
                this.createFullMap('trip-detail-map', coords.lat, coords.lon, trip.location);
            }
        }, 100);
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
                                <label class="flex items-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-all duration-200 ${trip.is_public ? 'bg-blue-50 border-blue-200' : ''}">
                                    <input type="radio" name="visibility" value="public" ${trip.is_public ? 'checked' : ''}
                                           class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                                    <span class="ml-3">
                                        <span class="font-medium text-gray-800">Public Trip</span>
                                        <span class="block text-sm text-gray-500">Anyone can discover and join this trip</span>
                                    </span>
                                </label>
                                <label class="flex items-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-all duration-200 ${!trip.is_public ? 'bg-blue-50 border-blue-200' : ''}">
                                    <input type="radio" name="visibility" value="private" ${!trip.is_public ? 'checked' : ''}
                                           class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                                    <span class="ml-3">
                                        <span class="font-medium text-gray-800">Private Trip</span>
                                        <span class="block text-sm text-gray-500">Only people with the trip code can join</span>
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

                        <div class="flex gap-3">
                            <button type="submit" class="ios-button-primary flex-1">
                                <span class="material-icons mr-2" style="font-size: 16px;">save</span>Update Trip
                            </button>
                            <button type="button" id="cancelEditTripBtn" class="ios-button-secondary">
                                Cancel
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

        // Update count badge
        if (countBadge) {
            countBadge.textContent = tasks ? tasks.length : 0;
        }

        if (!tasks || tasks.length === 0) {
            tasksList.innerHTML = `
                <div class="text-center py-6 text-gray-500">
                    <span class="material-icons text-3xl mb-2 opacity-50">assignment</span>
                    <p class="ios-callout">No tasks yet</p>
                    <p class="ios-footnote">Add tasks to organize your trip</p>
                </div>
            `;
            return;
        }

        tasksList.innerHTML = tasks.map(task => this.createTaskCard(task)).join('');

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
                            <label class="block text-sm font-medium text-gray-700 mb-3">Assignment *</label>
                            <div class="space-y-3">
                                <label class="flex items-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-all duration-200 ${(!isEdit || task.assignment_type === 'everyone') ? 'bg-blue-50 border-blue-200' : ''}">
                                    <input type="radio" name="assignmentType" value="everyone" ${(!isEdit || task.assignment_type === 'everyone') ? 'checked' : ''}
                                           class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                                    <span class="ml-3">
                                        <span class="font-medium text-gray-800">Everyone</span>
                                        <span class="block text-sm text-gray-500">This task is for all trip participants</span>
                                    </span>
                                </label>
                                <label class="flex items-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-all duration-200 ${(isEdit && task.assignment_type === 'anyone') ? 'bg-blue-50 border-blue-200' : ''}">
                                    <input type="radio" name="assignmentType" value="anyone" ${(isEdit && task.assignment_type === 'anyone') ? 'checked' : ''}
                                           class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                                    <span class="ml-3">
                                        <span class="font-medium text-gray-800">Anyone</span>
                                        <span class="block text-sm text-gray-500">First person to volunteer can take this task</span>
                                    </span>
                                </label>
                                <label class="flex items-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-all duration-200 ${(isEdit && task.assignment_type === 'specific') ? 'bg-blue-50 border-blue-200' : ''}">
                                    <input type="radio" name="assignmentType" value="specific" ${(isEdit && task.assignment_type === 'specific') ? 'checked' : ''}
                                           class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                                    <span class="ml-3">
                                        <span class="font-medium text-gray-800">Assign to specific person</span>
                                        <span class="block text-sm text-gray-500">Choose a specific trip participant</span>
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div id="specificAssigneeSection" class="mb-6 ${(!isEdit || task.assignment_type !== 'specific') ? 'hidden' : ''}">
                            <label for="assignedTo" class="block text-sm font-medium text-gray-700 mb-2">Assign to</label>
                            <select id="assignedTo" name="assignedTo"
                                    class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md appearance-none bg-no-repeat bg-right pr-10" 
                                    style="background-image: url('data:image/svg+xml;charset=US-ASCII,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 4 5%22><path fill=%22%23666%22 d=%22M2 0L0 2h4zm0 5L0 3h4z%22/></svg>'); background-position: right 12px center; background-size: 12px;">
                                <option value="">Select a person...</option>
                                <option value="${trip.organizer_id}" ${(isEdit && task.assigned_to === trip.organizer_id) ? 'selected' : ''}>${trip.organizer_name} (Organizer)</option>
                                ${trip.participants ? trip.participants.map(p => `
                                    <option value="${p.user_id}" ${(isEdit && task.assigned_to === p.user_id) ? 'selected' : ''}>${p.name}</option>
                                `).join('') : ''}
                            </select>
                        </div>

                        <div class="mb-6">
                            <div class="flex items-center mb-3">
                                <input type="checkbox" id="hasDueDate" name="hasDueDate" ${(isEdit && task.has_due_date) ? 'checked' : ''}
                                       class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                                <label for="hasDueDate" class="ml-2 text-sm font-medium text-gray-700">Set due date</label>
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

        // Handle assignment type changes
        const assignmentRadios = document.querySelectorAll('input[name="assignmentType"]');
        assignmentRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                const specificSection = document.getElementById('specificAssigneeSection');
                if (radio.value === 'specific') {
                    specificSection.classList.remove('hidden');
                } else {
                    specificSection.classList.add('hidden');
                }
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
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            assignmentType: formData.get('assignmentType'),
            assignedTo: formData.get('assignedTo') || null,
            hasDueDate: document.getElementById('hasDueDate').checked,
            dueDate: null
        };

        // Handle due date/time
        if (taskData.hasDueDate) {
            const dueDate = formData.get('dueDate');
            const dueTime = formData.get('dueTime');
            
            if (dueDate) {
                taskData.dueDate = dueTime ? `${dueDate}T${dueTime}:00` : `${dueDate}T23:59:00`;
            }
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

    renderTripParticipants(tripId, participants) {
        const participantsDiv = document.getElementById(`participants-${tripId}`);
        
        if (participants && participants.length > 0) {
            participantsDiv.innerHTML = participants.map(p => `
                <div class="flex items-center">
                    <span class="material-icons text-base mr-2 text-gray-400">account_circle</span>
                    <span>${p.name}</span>
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

}

// Global app instance for onclick handlers
let app;

// App initialization moved to HTML for Google Maps integration
