// Mental Health Assessment App - Main JavaScript

// Global variables
let currentStep = 0;
let questionnaireData = {};
let totalSteps = 4;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    
    // Form validation
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // Add validation feedback on input
            input.addEventListener('input', function() {
                validateInput(input);
            });
            
            // Add aria-invalid attribute for screen readers
            input.addEventListener('invalid', function() {
                this.setAttribute('aria-invalid', 'true');
            });
        });
        
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
                
                // Show error message
                showAlert('Please fill in all required fields correctly.', 'warning');
                
                // Focus first invalid field
                const firstInvalid = form.querySelector(':invalid');
                if (firstInvalid) {
                    firstInvalid.focus();
                }
            }
            form.classList.add('was-validated');
        });
    });

    // Add aria-labels to form controls
    const formControls = document.querySelectorAll('input, select, textarea');
    formControls.forEach(control => {
        if (!control.hasAttribute('aria-label')) {
            const label = document.querySelector(`label[for="${control.id}"]`);
            if (label) {
                control.setAttribute('aria-label', label.textContent);
            }
        }
    });
});

function initializeApp() {
    // Add smooth scrolling to all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Initialize tooltips if Bootstrap is available
    if (typeof bootstrap !== 'undefined') {
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    // Initialize questionnaire if on questionnaire page
    if (document.getElementById('questionnaire-form')) {
        initializeQuestionnaire();
    }

    // Initialize dashboard if on dashboard page
    if (document.getElementById('dashboard-container')) {
        initializeDashboard();
    }
}

// Questionnaire Functions
function initializeQuestionnaire() {
    showStep(0);
    updateProgressBar();
    
    // Add event listeners for navigation buttons
    document.getElementById('next-btn')?.addEventListener('click', handleNextClick);
    document.getElementById('prev-btn')?.addEventListener('click', prevStep);
    document.getElementById('submit-btn')?.addEventListener('click', submitQuestionnaire);
}

function handleNextClick() {
    // If we're on the final step, submit the form
    if (currentStep === totalSteps - 1) {
        submitQuestionnaire();
    } else {
        nextStep();
    }
}

function showStep(step) {
    // Hide all steps
    document.querySelectorAll('.questionnaire-step').forEach(stepElement => {
        stepElement.style.display = 'none';
    });
    
    // Show current step
    const currentStepElement = document.getElementById(`step-${step}`);
    if (currentStepElement) {
        currentStepElement.style.display = 'block';
    }
    
    // Update step indicators
    updateStepIndicators();
    
    // Update button visibility
    updateNavigationButtons();
    
    currentStep = step;
}

function updateStepIndicators() {
    document.querySelectorAll('.step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index < currentStep) {
            step.classList.add('completed');
        } else if (index === currentStep) {
            step.classList.add('active');
        }
    });
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    
    if (prevBtn) prevBtn.style.display = currentStep === 0 ? 'none' : 'inline-block';
    
    // Update Next button text and functionality for final step
    if (nextBtn) {
        if (currentStep === totalSteps - 1) {
            nextBtn.innerHTML = '<i class="fas fa-check me-2"></i>Get My Assessment';
            nextBtn.className = 'btn btn-success';
        } else {
            nextBtn.innerHTML = 'Next<i class="fas fa-arrow-right ms-2"></i>';
            nextBtn.className = 'btn btn-primary';
        }
        nextBtn.style.display = 'inline-block';
    }
    
    // Hide submit button (we'll use the Next button for final submission)
    if (submitBtn) submitBtn.style.display = 'none';
}

function updateProgressBar() {
    const progress = ((currentStep + 1) / totalSteps) * 100;
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = progress + '%';
        progressBar.setAttribute('aria-valuenow', progress);
    }
}

function nextStep() {
    if (validateCurrentStep()) {
        collectStepData();
        if (currentStep < totalSteps - 1) {
            showStep(currentStep + 1);
            updateProgressBar();
        }
    }
}

function prevStep() {
    if (currentStep > 0) {
        showStep(currentStep - 1);
        updateProgressBar();
    }
}

function validateCurrentStep() {
    const currentStepElement = document.getElementById(`step-${currentStep}`);
    if (!currentStepElement) return true;
    
    const requiredInputs = currentStepElement.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    requiredInputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            isValid = false;
        } else {
            input.classList.remove('is-invalid');
        }
    });
    
    if (!isValid) {
        showAlert('Please fill in all required fields before proceeding.', 'warning');
    }
    
    return isValid;
}

function collectStepData() {
    const currentStepElement = document.getElementById(`step-${currentStep}`);
    if (!currentStepElement) return;
    
    const inputs = currentStepElement.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.type === 'radio') {
            if (input.checked) {
                questionnaireData[input.name] = input.value;
            }
        } else {
            questionnaireData[input.name] = input.value;
        }
    });
}

async function submitQuestionnaire() {
    if (!validateCurrentStep()) return;
    
    collectStepData();
    
    // Show loading state
    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/submit-questionnaire', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(questionnaireData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Redirect to dashboard
            window.location.href = '/dashboard';
        } else {
            showAlert('Error processing your assessment. Please try again.', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Network error. Please check your connection and try again.', 'danger');
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Dashboard Functions
function initializeDashboard() {
    loadFeatureImportance();
    animateStatCards();
}

async function loadFeatureImportance() {
    try {
        const response = await fetch('/api/feature-importance');
        const data = await response.json();
        
        if (response.ok) {
            createFeatureImportanceChart(data);
        }
    } catch (error) {
        console.error('Error loading feature importance:', error);
    }
}

function createFeatureImportanceChart(data) {
    const chartContainer = document.getElementById('feature-importance-chart');
    if (!chartContainer) return;
    
    const trace = {
        x: data.importance,
        y: data.features,
        type: 'bar',
        orientation: 'h',
        marker: {
            color: '#FF6B35',
            opacity: 0.8
        }
    };
    
    const layout = {
        title: {
            text: 'Feature Importance',
            font: { family: 'Inter, sans-serif', size: 16, color: '#343A40' }
        },
        xaxis: { title: 'Importance Score' },
        yaxis: { title: 'Features' },
        margin: { l: 150, r: 50, t: 50, b: 50 },
        paper_bgcolor: 'white',
        plot_bgcolor: 'white'
    };
    
    const config = {
        displayModeBar: false,
        responsive: true
    };
    
    Plotly.newPlot(chartContainer, [trace], layout, config);
}

function animateStatCards() {
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'all 0.6s ease';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100);
        }, index * 200);
    });
}

// Flash Message Handler
class FlashMessage {
    static init() {
        this.container = document.querySelector('.flash-messages');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'flash-messages';
            document.body.appendChild(this.container);
        }
        
        // Handle existing flash messages
        this.initExistingMessages();
    }

    static initExistingMessages() {
        const messages = document.querySelectorAll('.alert');
        messages.forEach(message => {
            this.setupMessage(message);
        });
    }

    static show(message, type = 'info', duration = 5000) {
        const alert = document.createElement('div');
        const id = 'alert-' + Date.now();
        alert.id = id;
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.setAttribute('role', 'alert');
        
        // Add appropriate icon based on message type
        const icon = this.getIconForType(type);
        
        alert.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas ${icon} me-2"></i>
                <div>${message}</div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        this.container.appendChild(alert);
        this.setupMessage(alert, duration);
        
        // Announce for screen readers
        this.announceMessage(message, type);
        
        return id;
    }

    static setupMessage(alert, duration = 5000) {
        // Ensure Bootstrap is available
        if (typeof bootstrap !== 'undefined') {
            const bsAlert = new bootstrap.Alert(alert);
            
            // Auto-dismiss after duration
            if (duration > 0) {
                setTimeout(() => {
                    alert.classList.add('fade-out');
                    setTimeout(() => {
                        bsAlert.close();
                    }, 300);
                }, duration);
            }

            // Handle close button click
            const closeBtn = alert.querySelector('.btn-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    alert.classList.add('fade-out');
                });
            }
        }
    }

    static getIconForType(type) {
        const icons = {
            success: 'fa-check-circle',
            danger: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    static announceMessage(message, type) {
        // Create and update aria-live region for screen readers
        let liveRegion = document.getElementById('flash-message-live');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'flash-message-live';
            liveRegion.className = 'sr-only';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            document.body.appendChild(liveRegion);
        }
        liveRegion.textContent = `${type} alert: ${message}`;
    }

    static remove(id) {
        const alert = document.getElementById(id);
        if (alert) {
            alert.classList.add('fade-out');
            setTimeout(() => {
                alert.remove();
            }, 300);
        }
    }
}

// Initialize flash messages when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    FlashMessage.init();
});

// Utility Functions
function showAlert(message, type = 'info') {
    return FlashMessage.show(message, type);
}

function validateInput(input) {
    const isValid = input.checkValidity();
    input.setAttribute('aria-invalid', !isValid);
    
    // Remove existing feedback elements
    const existingFeedback = input.parentNode.querySelector('.invalid-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    // Add appropriate feedback
    if (!isValid) {
        const feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        feedback.textContent = input.validationMessage;
        input.parentNode.appendChild(feedback);
    }
    
    // Update form control classes
    input.classList.toggle('is-invalid', !isValid);
    input.classList.toggle('is-valid', isValid && input.value !== '');
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Range slider value display
document.addEventListener('input', function(e) {
    if (e.target.type === 'range') {
        const output = document.getElementById(e.target.id + '-value');
        if (output) {
            output.textContent = e.target.value;
        }
    }
});

// Form validation styling
document.addEventListener('input', function(e) {
    if (e.target.classList.contains('is-invalid')) {
        if (e.target.value.trim()) {
            e.target.classList.remove('is-invalid');
            e.target.classList.add('is-valid');
        }
    }
});

// Smooth page transitions
window.addEventListener('beforeunload', function() {
    document.body.style.opacity = '0.5';
});

// Alert auto-dismiss
const alerts = document.querySelectorAll('.alert');
alerts.forEach(alert => {
    setTimeout(() => {
        const closeButton = alert.querySelector('.btn-close');
        if (closeButton) {
            closeButton.click();
        }
    }, 5000);
});

// Enable tooltips
const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

// Dark mode toggle
const darkModeToggle = document.getElementById('darkModeToggle');
if (darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
    });

    // Check for saved dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }
}

// Loading indicator for form submissions
const showLoading = () => {
    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading-overlay';
    loadingEl.innerHTML = `
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    `;
    document.body.appendChild(loadingEl);
};

document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', showLoading);
});