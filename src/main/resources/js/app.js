// Fitness Application JavaScript
class FitnessApp {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        console.log('Fitness Application initialized');
        this.setupEventListeners();
        this.loadUserData();
    }

    setupEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => this.handleNavigation(e));
        });
    }

    handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const userType = document.getElementById('userType').value;

        if (!username || !password) {
            this.showAlert('Please enter both username and password', 'error');
            return;
        }

        // Simulate login process
        this.currentUser = {
            username: username,
            type: userType,
            loggedIn: true
        };

        this.saveUserData();
        this.updateUIAfterLogin();
        this.showAlert('Login successful! Welcome to Fitness App.', 'success');
    }

    handleNavigation(event) {
        const target = event.target;
        if (target.tagName === 'A') {
            event.preventDefault();
            const page = target.getAttribute('data-page');
            this.loadPage(page);
        }
    }

    updateUIAfterLogin() {
        // Hide login form and show user dashboard
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'block';
        
        // Update user info in header
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            userInfo.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar">${this.currentUser.username.charAt(0).toUpperCase()}</div>
                    <div>
                        <h3>Welcome, ${this.currentUser.username}!</h3>
                        <p>${this.getUserTypeLabel(this.currentUser.type)}</p>
                    </div>
                </div>
            `;
        }
    }

    getUserTypeLabel(userType) {
        const labels = {
            'free': 'Free User',
            'linked': 'Linked User',
            'trainer': 'Trainer Admin'
        };
        return labels[userType] || 'User';
    }

    saveUserData() {
        try {
            localStorage.setItem('fitnessAppUser', JSON.stringify(this.currentUser));
        } catch (error) {
            console.error('Error saving user data:', error);
        }
    }

    loadUserData() {
        try {
            const userData = localStorage.getItem('fitnessAppUser');
            if (userData) {
                this.currentUser = JSON.parse(userData);
                if (this.currentUser && this.currentUser.loggedIn) {
                    this.updateUIAfterLogin();
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        // Remove any existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());
        
        // Add new alert
        const container = document.querySelector('.container') || document.body;
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 3000);
    }

    loadPage(page) {
        console.log('Loading page:', page);
        // In a real application, this would fetch and display the appropriate content
        switch(page) {
            case 'dashboard':
                this.showDashboard();
                break;
            case 'plans':
                this.showTrainingPlans();
                break;
            case 'exercises':
                this.showExercises();
                break;
            default:
                console.log('Unknown page:', page);
        }
    }

    showDashboard() {
        // Show dashboard content
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = `
                <div class="card">
                    <h2>Dashboard</h2>
                    <p>Welcome to your fitness dashboard!</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 65%"></div>
                    </div>
                    <p>Weekly progress: 65%</p>
                </div>
            `;
        }
    }

    showTrainingPlans() {
        // Show training plans
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = `
                <div class="card">
                    <h2>Training Plans</h2>
                    <div class="exercise-list">
                        <div class="exercise-card">
                            <h3>Beginner Plan</h3>
                            <p>Perfect for new fitness enthusiasts</p>
                            <p>Duration: 4 weeks</p>
                        </div>
                        <div class="exercise-card">
                            <h3>Intermediate Plan</h3>
                            <p>For those with some experience</p>
                            <p>Duration: 6 weeks</p>
                        </div>
                        <div class="exercise-card">
                            <h3>Advanced Plan</h3>
                            <p>Challenging workouts for experienced users</p>
                            <p>Duration: 8 weeks</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    showExercises() {
        // Show exercises
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = `
                <div class="card">
                    <h2>Exercises</h2>
                    <div class="exercise-list">
                        <div class="exercise-card">
                            <h3>Push-ups</h3>
                            <p>Upper body strength exercise</p>
                            <p>Difficulty: Beginner</p>
                        </div>
                        <div class="exercise-card">
                            <h3>Squats</h3>
                            <p>Lower body strength exercise</p>
                            <p>Difficulty: Beginner</p>
                        </div>
                        <div class="exercise-card">
                            <h3>Plank</h3>
                            <p>Core strengthening exercise</p>
                            <p>Difficulty: Intermediate</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // Method to simulate API call to backend
    async fetchTrainingPlans() {
        try {
            // In a real application, this would be:
            // const response = await fetch('/api/training-plans');
            // const plans = await response.json();
            
            // Simulate API delay
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve([
                        { id: 1, name: 'Beginner Plan', duration: '4 weeks' },
                        { id: 2, name: 'Intermediate Plan', duration: '6 weeks' },
                        { id: 3, name: 'Advanced Plan', duration: '8 weeks' }
                    ]);
                }, 500);
            });
        } catch (error) {
            console.error('Error fetching training plans:', error);
            throw error;
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const fitnessApp = new FitnessApp();
    
    // Add some sample data for demonstration
    if (window.location.pathname === '/') {
        console.log('Fitness Application loaded');
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FitnessApp;
}