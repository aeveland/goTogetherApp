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
        document.getElementById('createTripBtn').addEventListener('click', () => this.showCreateTripSection());
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
        document.getElementById('authContainer').classList.add('hidden');
        document.getElementById('dashboardContainer').classList.remove('hidden');
        
        // Make sure trip details section is hidden on dashboard load
        const detailsSection = document.getElementById('tripDetailsSection');
        if (detailsSection) {
            detailsSection.classList.add('hidden');
            detailsSection.style.display = 'none';
        }
        
        // Show dashboard title and main action buttons on dashboard load
        const dashboardTitle = document.getElementById('dashboardTitle');
        if (dashboardTitle) {
            dashboardTitle.style.display = 'block';
        }
        
        const mainActionButtons = document.getElementById('mainActionButtons');
        if (mainActionButtons) {
            mainActionButtons.style.display = 'grid';
        }
        
        // Show user info in header
        document.getElementById('headerUserSection').classList.remove('hidden');
        document.getElementById('headerUserName').textContent = `${user.firstName} ${user.lastName}`;
        
        this.currentUser = user;
        
        // Load user's trips when dashboard is shown
        this.loadMyTrips();
    }

    showAuthForms() {
        document.getElementById('dashboardContainer').classList.add('hidden');
        document.getElementById('authContainer').classList.remove('hidden');
        document.getElementById('headerUserSection').classList.add('hidden');
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
                    <span class="material-icons text-base">${type === 'success' ? 'check_circle' : 'error'}</span>
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
                                <button id="joinByCodeBtn" class="apple-button text-white px-6 py-3 font-medium">
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
        const map = {
            vegetarian: 'Vegetarian',
            vegan: 'Vegan',
            gluten_free: 'Gluten-Free',
            dairy_free: 'Dairy-Free',
            nut_allergy: 'Nut Allergy',
            kosher: 'Kosher',
            halal: 'Halal',
            other: 'Other'
        };
        return dietary ? map[dietary] : 'None';
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
            phone: (formData.get('phone') || '').trim()
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

    generateTripCode() {
        // Generate a unique 6-character alphanumeric code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        document.getElementById('generatedTripCode').textContent = code;
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
            <div class="apple-card hover:shadow-lg transition-all cursor-pointer border border-gray-100 trip-card" 
                 data-trip-id="${trip.id}">
                <div class="p-4 sm:p-6">
                    <div class="flex justify-between items-start mb-3 sm:mb-4">
                        <h4 class="text-base sm:text-lg font-semibold text-gray-900 truncate-2 flex-1 mr-2">${trip.title}</h4>
                        <div class="flex gap-1 flex-shrink-0">
                            <span class="px-2 sm:px-3 py-1 text-xs rounded-full ${difficultyColors[trip.difficulty_level]} font-medium">
                                ${trip.difficulty_level}
                            </span>
                        </div>
                    </div>
                    
                    <!-- Mini Map -->
                    <div id="${mapId}" style="height: 100px; width: 100%; border-radius: 8px; margin-bottom: 12px; background: #f3f4f6;" class="sm:h-[120px] sm:mb-4"></div>
                    
                    <div class="space-y-2 sm:space-y-3 text-sm text-gray-600 mb-3 sm:mb-4">
                        <div class="flex items-center min-w-0">
                            <span class="material-icons text-base mr-2 sm:mr-3 text-gray-400 flex-shrink-0">place</span>
                            <span class="font-medium truncate">${trip.location}</span>
                        </div>
                        <div class="flex items-center">
                            <span class="material-icons text-base mr-2 sm:mr-3 text-gray-400 flex-shrink-0">event</span>
                            <span class="font-medium text-xs sm:text-sm">${startDate}</span>
                        </div>
                        <div class="flex items-center">
                            <span class="material-icons text-base mr-2 sm:mr-3 text-gray-400 flex-shrink-0">group</span>
                            <span class="font-medium">${trip.current_participants}/${trip.max_participants} going</span>
                        </div>
                    </div>

                    <div class="flex items-center justify-between flex-wrap gap-2">
                        <div class="flex items-center text-xs text-gray-500 min-w-0">
                            <span class="material-icons text-sm mr-1 flex-shrink-0">${typeIcons[trip.trip_type]}</span>
                            <span class="font-medium truncate">${trip.trip_type.replace('_', ' ')}</span>
                        </div>
                        
                        ${isOrganizer ? `
                            <span class="text-xs bg-blue-100 text-blue-800 px-2 sm:px-3 py-1 rounded-full font-medium flex items-center flex-shrink-0">
                                <span class="material-icons text-xs mr-1">star</span><span class="hidden sm:inline">Organizer</span><span class="sm:hidden">Org</span>
                            </span>
                        ` : isParticipant ? `
                            <span class="text-xs bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-full font-medium flex items-center flex-shrink-0">
                                <span class="material-icons text-xs mr-1">check_circle</span><span class="hidden sm:inline">Joined</span><span class="sm:hidden">✓</span>
                            </span>
                        ` : canJoin ? `
                            <span class="text-xs bg-gray-100 text-gray-600 px-2 sm:px-3 py-1 rounded-full font-medium flex items-center flex-shrink-0">
                                <span class="material-icons text-xs mr-1">add_circle</span><span class="hidden sm:inline">Available</span><span class="sm:hidden">Open</span>
                            </span>
                        ` : `
                            <span class="text-xs bg-red-100 text-red-800 px-2 sm:px-3 py-1 rounded-full font-medium flex items-center flex-shrink-0">
                                <span class="material-icons text-xs mr-1">cancel</span><span class="hidden sm:inline">Full</span><span class="sm:hidden">Full</span>
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
                        <span class="px-2 py-1 text-xs rounded-full ${difficultyColors[trip.difficulty_level]}">
                            ${trip.difficulty_level}
                        </span>
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
            <div class="mb-6">
                <button id="backFromDetailsBtn" class="text-blue-600 hover:text-blue-800 font-medium mb-4">
                    <span class="material-icons text-sm mr-2">arrow_back</span>Back to Trips
                </button>
                <div class="bg-white rounded-lg shadow-lg p-8">
                    <div class="flex justify-between items-start mb-6">
                        <div>
                            <h2 class="text-3xl font-bold text-gray-800 mb-2">${trip.title}</h2>
                            <p class="text-gray-600">Organized by ${trip.organizer_name}</p>
                        </div>
                        <div class="flex gap-2">
                            <span class="px-3 py-1 text-sm rounded-full bg-${trip.difficulty_level === 'easy' ? 'green' : trip.difficulty_level === 'moderate' ? 'yellow' : 'red'}-100 text-${trip.difficulty_level === 'easy' ? 'green' : trip.difficulty_level === 'moderate' ? 'yellow' : 'red'}-800">
                                ${trip.difficulty_level}
                            </span>
                            <span class="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800 flex items-center">
                                <span class="material-icons text-sm mr-1">${typeIcons[trip.trip_type]}</span>
                                ${trip.trip_type.replace('_', ' ')}
                            </span>
                        </div>
                    </div>

                    <!-- Full Map -->
                    <div class="mb-8">
                        <h3 class="font-semibold text-gray-800 mb-3 flex items-center"><span class="material-icons text-base mr-2">map</span>Location Map</h3>
                        <div id="trip-detail-map" style="height: 300px; width: 100%; border-radius: 8px; background: #f3f4f6;"></div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div class="space-y-4">
                            <div>
                                <h3 class="font-semibold text-gray-800 mb-2 flex items-center"><span class="material-icons text-base mr-2">place</span>Location</h3>
                                <p class="text-gray-600">${trip.location}</p>
                                ${trip.campground ? `<p class="text-sm text-gray-500">${trip.campground}</p>` : ''}
                            </div>
                            <div>
                                <h3 class="font-semibold text-gray-800 mb-2 flex items-center"><span class="material-icons text-base mr-2">event</span>Dates</h3>
                                <p class="text-gray-600">${startDate} - ${endDate}</p>
                            </div>
                        </div>
                        <div class="space-y-4">
                            <div>
                                <h3 class="font-semibold text-gray-800 mb-2 flex items-center"><span class="material-icons text-base mr-2">group</span>Participants</h3>
                                <p class="text-gray-600">${trip.current_participants}/${trip.max_participants} joined</p>
                            </div>
                            <div>
                                <h3 class="font-semibold text-gray-800 mb-2 flex items-center"><span class="material-icons text-base mr-2">nature</span>Trip Type</h3>
                                <p class="text-gray-600">${trip.trip_type.replace('_', ' ')} • ${trip.difficulty_level}</p>
                            </div>
                        </div>
                    </div>

                    ${trip.description ? `
                        <div class="mb-8">
                            <h3 class="font-semibold text-gray-800 mb-3 flex items-center"><span class="material-icons text-base mr-2">description</span>Description</h3>
                            <p class="text-gray-600 leading-relaxed">${trip.description}</p>
                        </div>
                    ` : ''}

                    ${trip.participants && trip.participants.length > 0 ? `
                        <div class="mb-8">
                            <h3 class="font-semibold text-gray-800 mb-4 flex items-center"><span class="material-icons text-base mr-2">people</span>Who's Going</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                ${trip.participants.map(p => `
                                    <div class="flex items-center bg-gray-50 p-3 rounded-lg">
                                        <span class="material-icons text-2xl text-gray-400 mr-3">account_circle</span>
                                        <div>
                                            <div class="font-medium text-gray-800">${p.name}</div>
                                            <div class="text-sm text-gray-500">joined ${new Date(p.joined_at).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Task List Section -->
                    <div class="mb-8">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="font-semibold text-gray-800 flex items-center">
                                <span class="material-icons text-base mr-2">checklist</span>Trip Tasks
                            </h3>
                            <button id="addTaskBtn-${trip.id}" data-trip-id="${trip.id}"
                                    class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 text-sm font-medium flex items-center">
                                <span class="material-icons text-sm mr-1">add</span>Add Task
                            </button>
                        </div>
                        <div id="tasksList-${trip.id}" class="space-y-3">
                            <!-- Tasks will be loaded here -->
                        </div>
                    </div>

                    <div class="flex gap-4 pt-6 border-t">
                        ${canJoin ? `
                            <button onclick="app.joinTrip(${trip.id})" 
                                    class="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200">
                                <span class="material-icons text-sm mr-2">add</span>Join This Trip
                            </button>
                        ` : ''}
                        ${isParticipant && !isOrganizer ? `
                            <button onclick="app.leaveTrip(${trip.id})" 
                                    class="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition duration-200">
                                <span class="material-icons text-sm mr-2">remove</span>Leave Trip
                            </button>
                        ` : ''}
                        ${isOrganizer ? `
                            <div class="flex gap-3">
                                <div class="bg-blue-100 text-blue-800 px-6 py-3 rounded-md">
                                    <span class="material-icons text-sm mr-2">star</span>You organize this trip
                                </div>
                                <button id="editTripBtn-${trip.id}" data-trip-id="${trip.id}"
                                        class="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200">
                                    <span class="material-icons text-sm mr-2">edit</span>Edit Trip
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Add back button event listener
        document.getElementById('backFromDetailsBtn').addEventListener('click', () => {
            detailsSection.classList.add('hidden');
            this.showMyTripsView();
        });

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
                this.showAddTaskForm(trip.id);
            });
        }

        // Load tasks for this trip
        this.loadTripTasks(trip.id);

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

                        <div class="flex gap-4">
                            <button type="submit"
                                    class="apple-button text-white py-3 px-8 font-medium flex items-center">
                                <span class="material-icons text-sm mr-2">save</span>Update Trip
                            </button>
                            <button type="button" id="cancelEditTripBtn"
                                    class="bg-gray-200 text-gray-700 py-3 px-8 rounded-xl hover:bg-gray-300 transition-all duration-200 font-medium shadow-sm hover:shadow-md">
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
        if (!tasksList) return;

        if (!tasks || tasks.length === 0) {
            tasksList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <span class="material-icons text-4xl mb-2 block">assignment</span>
                    <p>No tasks yet. Add the first task to get organized!</p>
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

                        <div class="flex gap-4">
                            <button type="submit"
                                    class="apple-button text-white py-3 px-8 font-medium flex items-center">
                                <span class="material-icons text-sm mr-2">${isEdit ? 'save' : 'add'}</span>${isEdit ? 'Update Task' : 'Create Task'}
                            </button>
                            <button type="button" id="cancelTaskFormBtn"
                                    class="bg-gray-200 text-gray-700 py-3 px-8 rounded-xl hover:bg-gray-300 transition-all duration-200 font-medium shadow-sm hover:shadow-md">
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
