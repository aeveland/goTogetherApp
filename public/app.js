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
        document.getElementById('toggleCreateTripBtn').addEventListener('click', () => this.toggleCreateTripSection());
        document.getElementById('refreshTripsBtn').addEventListener('click', () => this.loadTrips());
        
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

        const isOrganizer = this.currentUser && this.currentUser.id === trip.organizer_id;
        const isParticipant = trip.participants && trip.participants.some(p => p.name === `${this.currentUser.firstName} ${this.currentUser.lastName}`);
        const canJoin = this.currentUser && !isParticipant && trip.current_participants < trip.max_participants;

        return `
            <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow" id="trip-${trip.id}">
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
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="space-y-2 text-sm text-gray-600">
                        <div class="flex items-center">
                            <i class="fas fa-map-marker-alt w-4 mr-2"></i>
                            <span>${trip.location}</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-calendar w-4 mr-2"></i>
                            <span>${startDate} - ${endDate}</span>
                        </div>
                        ${trip.campground ? `
                            <div class="flex items-center">
                                <i class="fas fa-campground w-4 mr-2"></i>
                                <span>${trip.campground}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="space-y-2 text-sm text-gray-600">
                        <div class="flex items-center">
                            <i class="fas fa-users w-4 mr-2"></i>
                            <span>${trip.current_participants}/${trip.max_participants} participants</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-user-tie w-4 mr-2"></i>
                            <span>Organized by ${trip.organizer_name}</span>
                        </div>
                    </div>
                </div>

                ${trip.description ? `<p class="text-gray-700 text-sm mb-4">${trip.description}</p>` : ''}
                
                <div class="flex gap-2 pt-4 border-t">
                    ${canJoin ? `
                        <button onclick="app.joinTrip(${trip.id})" 
                                class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200">
                            <i class="fas fa-plus mr-2"></i>Join Trip
                        </button>
                    ` : ''}
                    ${isParticipant && !isOrganizer ? `
                        <button onclick="app.leaveTrip(${trip.id})" 
                                class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition duration-200">
                            <i class="fas fa-minus mr-2"></i>Leave Trip
                        </button>
                    ` : ''}
                    ${isOrganizer ? `
                        <div class="bg-blue-100 text-blue-800 px-4 py-2 rounded-md">
                            <i class="fas fa-crown mr-2"></i>You organize this trip
                        </div>
                    ` : ''}
                    <button onclick="app.toggleTripDetails(${trip.id})" 
                            class="ml-auto text-blue-600 hover:text-blue-800 font-medium">
                        <span id="toggle-text-${trip.id}">Show Details</span> <i class="fas fa-chevron-down ml-1" id="toggle-icon-${trip.id}"></i>
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

    toggleCreateTripSection() {
        const section = document.getElementById('createTripSection');
        const button = document.getElementById('toggleCreateTripBtn');
        
        if (section.classList.contains('hidden')) {
            section.classList.remove('hidden');
            button.innerHTML = '<i class="fas fa-times mr-2"></i>Cancel';
            button.classList.remove('bg-green-600', 'hover:bg-green-700');
            button.classList.add('bg-gray-600', 'hover:bg-gray-700');
        } else {
            this.hideCreateTripSection();
        }
    }

    hideCreateTripSection() {
        const section = document.getElementById('createTripSection');
        const button = document.getElementById('toggleCreateTripBtn');
        
        section.classList.add('hidden');
        button.innerHTML = '<i class="fas fa-plus mr-2"></i>Create New Trip';
        button.classList.remove('bg-gray-600', 'hover:bg-gray-700');
        button.classList.add('bg-green-600', 'hover:bg-green-700');
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
                this.hideCreateTripSection();
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

    async toggleTripDetails(tripId) {
        const detailsDiv = document.getElementById(`trip-details-${tripId}`);
        const toggleText = document.getElementById(`toggle-text-${tripId}`);
        const toggleIcon = document.getElementById(`toggle-icon-${tripId}`);
        
        if (detailsDiv.classList.contains('hidden')) {
            // Show details
            try {
                const response = await fetch(`/api/trips/${tripId}`, {
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    this.renderTripParticipants(tripId, data.trip.participants);
                    detailsDiv.classList.remove('hidden');
                    toggleText.textContent = 'Hide Details';
                    toggleIcon.classList.remove('fa-chevron-down');
                    toggleIcon.classList.add('fa-chevron-up');
                } else {
                    this.showMessage('Failed to load trip details', 'error');
                }
            } catch (error) {
                console.error('Error loading trip details:', error);
                this.showMessage('Network error loading trip details', 'error');
            }
        } else {
            // Hide details
            detailsDiv.classList.add('hidden');
            toggleText.textContent = 'Show Details';
            toggleIcon.classList.remove('fa-chevron-up');
            toggleIcon.classList.add('fa-chevron-down');
        }
    }

    renderTripParticipants(tripId, participants) {
        const participantsDiv = document.getElementById(`participants-${tripId}`);
        
        if (participants && participants.length > 0) {
            participantsDiv.innerHTML = participants.map(p => `
                <div class="flex items-center">
                    <i class="fas fa-user-circle mr-2 text-gray-400"></i>
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
                this.loadTrips(); // Refresh trips list
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

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app = new CampingApp();
});
