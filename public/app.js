class CampingApp {
    constructor() {
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.dashboard = document.getElementById('dashboard');
        this.messageContainer = document.getElementById('messageContainer');
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
        
        // Dashboard actions
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        document.getElementById('createTripBtn').addEventListener('click', () => this.showCreateTripModal());
        document.getElementById('refreshTripsBtn').addEventListener('click', () => this.loadTrips());
        
        // Modal actions
        document.getElementById('closeTripModal').addEventListener('click', () => this.hideCreateTripModal());
        document.getElementById('cancelTripBtn').addEventListener('click', () => this.hideCreateTripModal());
        document.getElementById('createTripForm').addEventListener('submit', (e) => this.handleCreateTrip(e));
        document.getElementById('closeTripDetailsModal').addEventListener('click', () => this.hideTripDetailsModal());
        
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
        document.getElementById('authContainer').classList.add('hidden');
        document.getElementById('dashboardContainer').classList.remove('hidden');
        
        this.currentUser = user;
        document.getElementById('userInfo').textContent = `${user.firstName} ${user.lastName} (${user.email})`;
        
        // Load trips when dashboard is shown
        this.loadTrips();
    }

    showAuthForms() {
        document.getElementById('dashboardContainer').classList.add('hidden');
        document.getElementById('authContainer').classList.remove('hidden');
        this.loginForm.classList.remove('hidden');
        this.registerForm.classList.add('hidden');
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
        
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ firstName, lastName, email, password })
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

    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `p-4 rounded-md mb-4 ${
            type === 'success' 
                ? 'bg-green-100 border border-green-400 text-green-700' 
                : 'bg-red-100 border border-red-400 text-red-700'
        }`;
        
        messageDiv.innerHTML = `
            <div class="flex">
                <div class="flex-shrink-0">
                    <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium">${message}</p>
                </div>
            </div>
        `;
        
        this.messageContainer.innerHTML = '';
        this.messageContainer.appendChild(messageDiv);
        
        // Auto-remove success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 3000);
        }
    }

    clearMessages() {
        this.messageContainer.innerHTML = '';
    }

    clearForms() {
        document.getElementById('loginFormElement').reset();
        document.getElementById('registerFormElement').reset();
    }

    // Camping Trip Methods
    async loadTrips() {
        try {
            const response = await fetch('/api/trips', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.trips = data.trips;
                this.renderTrips();
            } else {
                this.showMessage('Failed to load trips', 'error');
            }
        } catch (error) {
            console.error('Error loading trips:', error);
            this.showMessage('Network error loading trips', 'error');
        }
    }

    renderTrips() {
        const tripsList = document.getElementById('tripsList');
        const noTrips = document.getElementById('noTrips');

        if (this.trips.length === 0) {
            tripsList.innerHTML = '';
            noTrips.classList.remove('hidden');
            return;
        }

        noTrips.classList.add('hidden');
        tripsList.innerHTML = this.trips.map(trip => this.createTripCard(trip)).join('');
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
            car_camping: 'fa-car',
            backpacking: 'fa-hiking',
            rv_camping: 'fa-truck',
            glamping: 'fa-bed'
        };

        return `
            <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer" 
                 onclick="app.showTripDetails(${trip.id})">
                <div class="flex justify-between items-start mb-4">
                    <h4 class="text-xl font-semibold text-gray-800">${trip.title}</h4>
                    <div class="flex gap-2">
                        <span class="px-2 py-1 text-xs rounded-full ${difficultyColors[trip.difficulty_level]}">
                            ${trip.difficulty_level}
                        </span>
                        <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            <i class="fas ${typeIcons[trip.trip_type]} mr-1"></i>
                            ${trip.trip_type.replace('_', ' ')}
                        </span>
                    </div>
                </div>
                
                <div class="space-y-2 text-sm text-gray-600 mb-4">
                    <div class="flex items-center">
                        <i class="fas fa-map-marker-alt w-4 mr-2"></i>
                        <span>${trip.location}</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-calendar w-4 mr-2"></i>
                        <span>${startDate} - ${endDate}</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-users w-4 mr-2"></i>
                        <span>${trip.current_participants}/${trip.max_participants} participants</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-user-tie w-4 mr-2"></i>
                        <span>Organized by ${trip.organizer_name}</span>
                    </div>
                </div>

                ${trip.description ? `<p class="text-gray-700 text-sm line-clamp-2">${trip.description}</p>` : ''}
                
                <div class="mt-4 flex justify-between items-center">
                    <div class="text-sm text-gray-500">
                        ${trip.campground ? `📍 ${trip.campground}` : ''}
                    </div>
                    <button class="text-blue-600 hover:text-blue-800 font-medium text-sm">
                        View Details →
                    </button>
                </div>
            </div>
        `;
    }

    showCreateTripModal() {
        document.getElementById('createTripModal').classList.remove('hidden');
    }

    hideCreateTripModal() {
        document.getElementById('createTripModal').classList.add('hidden');
        document.getElementById('createTripForm').reset();
    }

    async handleCreateTrip(e) {
        e.preventDefault();

        const formData = {
            title: document.getElementById('tripTitle').value,
            description: document.getElementById('tripDescription').value,
            location: document.getElementById('tripLocation').value,
            campground: document.getElementById('tripCampground').value,
            startDate: document.getElementById('tripStartDate').value,
            endDate: document.getElementById('tripEndDate').value,
            maxParticipants: parseInt(document.getElementById('tripMaxParticipants').value),
            difficultyLevel: document.getElementById('tripDifficulty').value,
            tripType: document.getElementById('tripType').value
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
                this.hideCreateTripModal();
                this.loadTrips(); // Refresh the trips list
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
                this.renderTripDetails(data.trip);
                document.getElementById('tripDetailsModal').classList.remove('hidden');
            } else {
                this.showMessage('Failed to load trip details', 'error');
            }
        } catch (error) {
            console.error('Error loading trip details:', error);
            this.showMessage('Network error loading trip details', 'error');
        }
    }

    renderTripDetails(trip) {
        const startDate = new Date(trip.start_date).toLocaleDateString();
        const endDate = new Date(trip.end_date).toLocaleDateString();
        const isOrganizer = this.currentUser && this.currentUser.id === trip.organizer_id;
        const isParticipant = trip.participants.some(p => p.name === `${this.currentUser.firstName} ${this.currentUser.lastName}`);
        const canJoin = this.currentUser && !isParticipant && trip.current_participants < trip.max_participants;

        document.getElementById('tripDetailsTitle').textContent = trip.title;
        document.getElementById('tripDetailsContent').innerHTML = `
            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 class="font-semibold text-gray-800 mb-2">📍 Location</h4>
                        <p class="text-gray-600">${trip.location}</p>
                        ${trip.campground ? `<p class="text-sm text-gray-500">${trip.campground}</p>` : ''}
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-800 mb-2">📅 Dates</h4>
                        <p class="text-gray-600">${startDate} - ${endDate}</p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-800 mb-2">👥 Participants</h4>
                        <p class="text-gray-600">${trip.current_participants}/${trip.max_participants} joined</p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-800 mb-2">🏕️ Trip Type</h4>
                        <p class="text-gray-600">${trip.trip_type.replace('_', ' ')} • ${trip.difficulty_level}</p>
                    </div>
                </div>

                ${trip.description ? `
                    <div>
                        <h4 class="font-semibold text-gray-800 mb-2">📝 Description</h4>
                        <p class="text-gray-600">${trip.description}</p>
                    </div>
                ` : ''}

                <div>
                    <h4 class="font-semibold text-gray-800 mb-2">👤 Organizer</h4>
                    <p class="text-gray-600">${trip.organizer_name}</p>
                </div>

                ${trip.participants.length > 0 ? `
                    <div>
                        <h4 class="font-semibold text-gray-800 mb-2">🏕️ Participants</h4>
                        <div class="space-y-1">
                            ${trip.participants.map(p => `
                                <div class="flex items-center text-gray-600">
                                    <i class="fas fa-user-circle mr-2"></i>
                                    <span>${p.name}</span>
                                    <span class="text-xs text-gray-400 ml-2">joined ${new Date(p.joined_at).toLocaleDateString()}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${this.currentUser ? `
                    <div class="flex gap-4 pt-4 border-t">
                        ${canJoin ? `
                            <button onclick="app.joinTrip(${trip.id})" 
                                    class="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200">
                                <i class="fas fa-plus mr-2"></i>Join Trip
                            </button>
                        ` : ''}
                        ${isParticipant && !isOrganizer ? `
                            <button onclick="app.leaveTrip(${trip.id})" 
                                    class="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition duration-200">
                                <i class="fas fa-minus mr-2"></i>Leave Trip
                            </button>
                        ` : ''}
                        ${isOrganizer ? `
                            <div class="flex-1 bg-blue-100 text-blue-800 py-2 px-4 rounded-md text-center">
                                <i class="fas fa-crown mr-2"></i>You organize this trip
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
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
                this.hideTripDetailsModal();
                this.loadTrips(); // Refresh trips list
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
                this.hideTripDetailsModal();
                this.loadTrips(); // Refresh trips list
            } else {
                this.showMessage(data.error || 'Failed to leave trip', 'error');
            }
        } catch (error) {
            console.error('Error leaving trip:', error);
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    hideTripDetailsModal() {
        document.getElementById('tripDetailsModal').classList.add('hidden');
    }
}

// Global app instance for onclick handlers
let app;

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app = new CampingApp();
});
