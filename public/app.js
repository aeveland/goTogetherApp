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
        const detailsSection = document.getElementById('tripDetailsSection');
        if (detailsSection) detailsSection.classList.add('hidden');
        const joinSection = document.getElementById('joinTripSection');
        if (joinSection) joinSection.classList.add('hidden');
        this.loadMyTrips();
    }

    showBrowseTripsView() {
        document.getElementById('myTripsContainer').classList.add('hidden');
        document.getElementById('allTripsContainer').classList.remove('hidden');
        document.getElementById('createTripSection').classList.add('hidden');
        const detailsSection = document.getElementById('tripDetailsSection');
        if (detailsSection) detailsSection.classList.add('hidden');
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
    }

    renderAllTrips() {
        const tripsList = document.getElementById('allTripsList');

        if (!this.allTrips || this.allTrips.length === 0) {
            tripsList.innerHTML = '<div class="col-span-full text-center py-8 text-gray-500"><p>No public trips available</p></div>';
            return;
        }

        tripsList.innerHTML = this.allTrips.map(trip => this.createTripSnapshotCard(trip)).join('');
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

        return `
            <div class="apple-card hover:shadow-lg transition-all cursor-pointer border border-gray-100" 
                 onclick="app.showTripDetails(${trip.id})">
                <div class="p-6">
                    <div class="flex justify-between items-start mb-4">
                        <h4 class="text-lg font-semibold text-gray-900 line-clamp-1">${trip.title}</h4>
                        <div class="flex gap-1">
                            <span class="px-3 py-1 text-xs rounded-full ${difficultyColors[trip.difficulty_level]} font-medium">
                                ${trip.difficulty_level}
                            </span>
                        </div>
                    </div>
                    
                    <div class="space-y-3 text-sm text-gray-600 mb-4">
                        <div class="flex items-center">
                            <span class="material-icons text-base mr-3 text-gray-400">place</span>
                            <span class="truncate font-medium">${trip.location}</span>
                        </div>
                        <div class="flex items-center">
                            <span class="material-icons text-base mr-3 text-gray-400">event</span>
                            <span class="font-medium">${startDate}</span>
                        </div>
                        <div class="flex items-center">
                            <span class="material-icons text-base mr-3 text-gray-400">group</span>
                            <span class="font-medium">${trip.current_participants}/${trip.max_participants} going</span>
                        </div>
                    </div>

                    <div class="flex items-center justify-between">
                        <div class="flex items-center text-xs text-gray-500">
                            <span class="material-icons text-sm mr-1">${typeIcons[trip.trip_type]}</span>
                            <span class="font-medium">${trip.trip_type.replace('_', ' ')}</span>
                        </div>
                        
                        ${isOrganizer ? `
                            <span class="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                                <span class="material-icons text-xs mr-1">star</span>Organizer
                            </span>
                        ` : isParticipant ? `
                            <span class="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                                <span class="material-icons text-xs mr-1">check_circle</span>Joined
                            </span>
                        ` : canJoin ? `
                            <span class="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
                                <span class="material-icons text-xs mr-1">add_circle</span>Available
                            </span>
                        ` : `
                            <span class="text-xs bg-red-100 text-red-800 px-3 py-1 rounded-full font-medium">
                                <span class="material-icons text-xs mr-1">cancel</span>Full
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
        const isParticipant = trip.participants && trip.participants.some(p => p.name === `${this.currentUser.firstName} ${this.currentUser.lastName}`);
        const canJoin = this.currentUser && !isParticipant && trip.current_participants < trip.max_participants;

        // Hide other sections and show trip details
        document.getElementById('myTripsContainer').classList.add('hidden');
        document.getElementById('allTripsContainer').classList.add('hidden');
        document.getElementById('createTripSection').classList.add('hidden');
        
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
                    <i class="fas fa-arrow-left mr-2"></i>Back to Trips
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
                            <span class="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800">
                                ${trip.trip_type.replace('_', ' ')}
                            </span>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div class="space-y-4">
                            <div>
                                <h3 class="font-semibold text-gray-800 mb-2">📍 Location</h3>
                                <p class="text-gray-600">${trip.location}</p>
                                ${trip.campground ? `<p class="text-sm text-gray-500">${trip.campground}</p>` : ''}
                            </div>
                            <div>
                                <h3 class="font-semibold text-gray-800 mb-2">📅 Dates</h3>
                                <p class="text-gray-600">${startDate} - ${endDate}</p>
                            </div>
                        </div>
                        <div class="space-y-4">
                            <div>
                                <h3 class="font-semibold text-gray-800 mb-2">👥 Participants</h3>
                                <p class="text-gray-600">${trip.current_participants}/${trip.max_participants} joined</p>
                            </div>
                            <div>
                                <h3 class="font-semibold text-gray-800 mb-2">🏕️ Trip Type</h3>
                                <p class="text-gray-600">${trip.trip_type.replace('_', ' ')} • ${trip.difficulty_level}</p>
                            </div>
                        </div>
                    </div>

                    ${trip.description ? `
                        <div class="mb-8">
                            <h3 class="font-semibold text-gray-800 mb-3">📝 Description</h3>
                            <p class="text-gray-600 leading-relaxed">${trip.description}</p>
                        </div>
                    ` : ''}

                    ${trip.participants && trip.participants.length > 0 ? `
                        <div class="mb-8">
                            <h3 class="font-semibold text-gray-800 mb-4">🏕️ Who's Going</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                ${trip.participants.map(p => `
                                    <div class="flex items-center bg-gray-50 p-3 rounded-lg">
                                        <i class="fas fa-user-circle text-2xl text-gray-400 mr-3"></i>
                                        <div>
                                            <div class="font-medium text-gray-800">${p.name}</div>
                                            <div class="text-sm text-gray-500">joined ${new Date(p.joined_at).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <div class="flex gap-4 pt-6 border-t">
                        ${canJoin ? `
                            <button onclick="app.joinTrip(${trip.id})" 
                                    class="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200">
                                <i class="fas fa-plus mr-2"></i>Join This Trip
                            </button>
                        ` : ''}
                        ${isParticipant && !isOrganizer ? `
                            <button onclick="app.leaveTrip(${trip.id})" 
                                    class="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition duration-200">
                                <i class="fas fa-minus mr-2"></i>Leave Trip
                            </button>
                        ` : ''}
                        ${isOrganizer ? `
                            <div class="bg-blue-100 text-blue-800 px-6 py-3 rounded-md">
                                <i class="fas fa-crown mr-2"></i>You organize this trip
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

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app = new CampingApp();
});
