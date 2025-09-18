// Mental Health Assessment App - Main JavaScript

// Global variables
let currentStep = 0;
let questionnaireData = {};
let totalSteps = 4;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    attachFormHandlers();
    
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

// Page Navigation Handling
window.addEventListener('pageshow', function(event) {
    // Handle back/forward navigation
    if (event.persisted) {
        // Page is loaded from cache (back/forward navigation)
        window.location.reload();
    }
});

// Remove transition classes on page load
document.addEventListener('DOMContentLoaded', function() {
    // Remove any leftover transition classes
    document.querySelectorAll('[class*="transition"]').forEach(element => {
        element.classList.remove(element.classList.toString().match(/transition\S+/g));
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
    if (document.getElementById('feature-importance-chart')) {
        initializeDashboard();
    }
}

function attachFormHandlers() {
    const form = document.getElementById('questionnaire-form');
    if (!form) return;

    // Add input change handlers
    form.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('change', handleInputChange);
    });

    // Add range input handlers
    form.querySelectorAll('input[type="range"]').forEach(range => {
        const valueDisplay = document.getElementById(`${range.id}-value`);
        if (valueDisplay) {
            range.addEventListener('input', () => {
                valueDisplay.textContent = range.value;
                handleInputChange({ target: range });
            });
        }
    });
}

function handleInputChange(event) {
    const input = event.target;
    // Update questionnaireData
    if (input.type === 'radio') {
        if (input.checked) {
            questionnaireData[input.name] = input.value;
        }
    } else if (input.type !== 'checkbox') {
        questionnaireData[input.name] = input.value;
    }
    
    // Update review section if we're on it
    if (currentStep === totalSteps - 1) {
        populateReviewSection();
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
        currentStepElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Update UI elements
    updateStepIndicators();
    updateNavigationButtons();
    currentStep = step;
    
    // Update step counter
    const stepCounter = document.getElementById('current-step');
    if (stepCounter) {
        stepCounter.textContent = currentStep + 1;
    }

    // Handle review step
    if (step === totalSteps - 1) {
        setTimeout(() => {
            populateReviewSection();
            disableInputsInReviewStep();
        }, 100);
    }
}

function updateStepIndicators() {
    const steps = document.querySelectorAll('.step');
    const progressBar = document.querySelector('.progress-bar');
    const progress = ((currentStep + 1) / totalSteps) * 100;
    
    steps.forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index < currentStep) {
            step.classList.add('completed');
        } else if (index === currentStep) {
            step.classList.add('active');
            step.querySelector('.step-circle').setAttribute('aria-current', 'step');
        } else {
            step.querySelector('.step-circle').removeAttribute('aria-current');
        }
    });
    
    // Update progress bar with animation
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
    }
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
    if (!validateCurrentStep()) return;
    
    collectStepData();
    if (currentStep < totalSteps - 1) {
        showStep(currentStep + 1);
    }
}

function prevStep() {
    if (currentStep > 0) {
        showStep(currentStep - 1);
    }
}

function collectStepData() {
    const currentStepElement = document.getElementById(`step-${currentStep}`);
    if (!currentStepElement) return;

    currentStepElement.querySelectorAll('input, select').forEach(input => {
        if (input.type === 'radio') {
            if (input.checked) {
                questionnaireData[input.name] = input.value;
            }
        } else if (input.type !== 'checkbox') {
            questionnaireData[input.name] = input.value;
        }
    });
}

function validateCurrentStep() {
    const currentStepElement = document.getElementById(`step-${currentStep}`);
    if (!currentStepElement) return true;

    let isValid = true;
    const requiredInputs = currentStepElement.querySelectorAll('[required]');
    
    requiredInputs.forEach(input => {
        if (input.type === 'radio') {
            const radioGroup = currentStepElement.querySelectorAll(`input[name="${input.name}"]`);
            const isChecked = Array.from(radioGroup).some(radio => radio.checked);
            if (!isChecked) {
                isValid = false;
                showInputError(input, 'Please select an option');
            }
        } else if (!input.value.trim()) {
            isValid = false;
            showInputError(input, 'This field is required');
        }
    });

    if (!isValid) {
        showAlert('Please fill in all required fields before proceeding.', 'warning');
    }

    return isValid;
}

function showInputError(input, message) {
    input.classList.add('is-invalid');
    
    // Remove existing error message if any
    const existingError = input.parentElement.querySelector('.invalid-feedback');
    if (existingError) {
        existingError.remove();
    }
    
    // Add new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.textContent = message;
    input.parentElement.appendChild(errorDiv);
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
            // Store the new prediction data
            sessionStorage.setItem('latest_prediction', JSON.stringify(result));
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
    console.log('Initializing dashboard...');
    const checkPlotly = setInterval(() => {
        if (window.Plotly) {
            clearInterval(checkPlotly);
            // Load feature importance data immediately
            loadFeatureImportance();
            animateStatCards();
        }
    }, 100);

    setTimeout(() => {
        clearInterval(checkPlotly);
        handleLoadError('Chart library failed to load');
    }, 5000);
}

async function loadFeatureImportance() {
    const chartContainer = document.getElementById('feature-importance-chart');
    const loadingSpinner = document.getElementById('chart-loading');
    if (!chartContainer) return;

    try {
        loadingSpinner?.classList.remove('d-none');
        
        const response = await fetch('/api/feature-importance', {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

        if (!response.ok) throw new Error('Failed to load feature importance data');
        
        const data = await response.json();
        if (!data.features || !data.importance || data.features.length === 0) {
            throw new Error('Invalid data format received');
        }

        // Create sorted indices based on importance values
        const sortedIndices = data.importance
            .map((value, index) => ({ value, index }))
            .sort((a, b) => b.value - a.value)
            .map(item => item.index);

        // Sort both features and importance arrays using the sorted indices
        const sortedFeatures = sortedIndices.map(i => data.features[i]);
        const sortedImportance = sortedIndices.map(i => data.importance[i]);

        // Take top 10 features
        const features = sortedFeatures.slice(0, 10);
        const importance = sortedImportance.slice(0, 10);

        // Create and update chart
        await createFeatureImportanceChart({
            features,
            importance,
            is_fallback: data.is_fallback,
            message: data.message,
            timestamp: data.timestamp
        });

    } catch (error) {
        console.error('Error loading feature importance:', error);
        handleLoadError(error.message);
    } finally {
        loadingSpinner?.classList.add('d-none');
    }
}

function handleLoadError(message) {
    const chartContainer = document.getElementById('feature-importance-chart');
    const errorContainer = document.getElementById('chart-error');
    if (chartContainer && errorContainer) {
        errorContainer.style.display = 'block';
        errorContainer.querySelector('.error-message').textContent = message;
    }
}

async function createFeatureImportanceChart(data) {
    const chartContainer = document.getElementById('feature-importance-chart');
    
    // Clear existing content
    chartContainer.innerHTML = '';
    
    // Show warning banner if using fallback data
    const existingWarning = document.querySelector('.alert-warning');
    if (existingWarning) existingWarning.remove();
    
    if (data.is_fallback) {
        const warningBanner = document.createElement('div');
        warningBanner.className = 'alert alert-warning mb-3';
        warningBanner.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${data.message || 'Using sample data - model data unavailable'}
        `;
        chartContainer.parentNode.insertBefore(warningBanner, chartContainer);
    }

    const trace = {
        x: data.importance,
        y: data.features,
        type: 'bar',
        orientation: 'h',
        marker: {
            color: data.importance.map((val, i) => {
                // Use a color scale that emphasizes important features
                const colors = ['#DC3545', '#FD7E14', '#FFC107', '#20C997', '#0D6EFD'];
                return colors[Math.min(Math.floor(i/2), colors.length - 1)];
            }),
            opacity: 0.8
        },
        text: data.importance.map(val => (val * 100).toFixed(1) + '%'),
        textposition: 'auto',
        hovertemplate: '<b>%{y}</b><br>Importance: %{text}<extra></extra>'
    };
    
    const layout = {
        title: {
            text: 'Factors Influencing Your Mental Health Score',
            font: { family: 'Inter, sans-serif', size: 18, color: '#343A40' }
        },
        xaxis: { 
            title: 'Impact Level',
            tickformat: ',.1%',
            range: [0, Math.max(...data.importance) * 1.1]
        },
        yaxis: { 
            title: '',
            automargin: true
        },
        margin: { l: 200, r: 50, t: 60, b: 50 },
        paper_bgcolor: 'white',
        plot_bgcolor: 'white',
        font: { family: 'Inter, sans-serif' },
        showlegend: false,
        height: 500,
        width: undefined,
        annotations: [{
            x: 1,
            y: -0.15,
            text: data.timestamp ? `Last updated: ${new Date(data.timestamp * 1000).toLocaleTimeString()}` : '',
            showarrow: false,
            xref: 'paper',
            yref: 'paper',
            font: { size: 10, color: '#6C757D' }
        }]
    };
    
    const config = {
        displayModeBar: false,
        responsive: true
    };

    try {
        await Plotly.newPlot(chartContainer, [trace], layout, config);
        
        // Add window resize handler for responsiveness
        window.addEventListener('resize', () => {
            Plotly.Plots.resize(chartContainer);
        });
        
        // Add smooth transition for updates
        chartContainer.style.transition = 'opacity 0.3s ease-in-out';
        chartContainer.style.opacity = '1';
        
    } catch (error) {
        console.error('Error creating chart:', error);
        handleLoadError(`Error creating chart: ${error.message}`);
    }
}

// Initialize feature importance chart on page load
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('feature-importance-chart')) {
        initializeDashboard();
    }
});

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

function populateReviewSection() {
    console.log('Populating review section...');
    
    // Collect all form data first
    const formData = {};
    const form = document.getElementById('questionnaire-form');
    if (!form) {
        console.error('Questionnaire form not found');
        return;
    }

    // Get all form inputs
    const inputs = form.querySelectorAll('input:not([type="hidden"]), select');
    inputs.forEach(input => {
        if (input.type === 'radio') {
            if (input.checked) {
                formData[input.name] = input.value;
            }
        } else {
            formData[input.name] = input.value;
        }
    });

    console.log('Form data collected:', formData);

    // Update review sections
    Object.entries(formData).forEach(([key, value]) => {
        const reviewElement = document.getElementById(`review-${key.replace('_', '-')}`);
        if (reviewElement) {
            let displayValue = value;
            
            // Handle select elements
            const inputElement = document.getElementById(key);
            if (inputElement?.tagName === 'SELECT') {
                displayValue = inputElement.options[inputElement.selectedIndex]?.text || value;
            }
            
            // Handle radio buttons
            if (inputElement?.type === 'radio') {
                const label = document.querySelector(`label[for="${inputElement.id}"]`);
                displayValue = label?.textContent.trim() || value;
            }
            
            // Add units where appropriate
            if (key === 'sleep_duration') displayValue += ' hours';
            if (key === 'screen_time') displayValue += ' hours/day';
            if (key === 'age') displayValue += ' years';
            
            reviewElement.textContent = displayValue;
            console.log(`Updated ${key} with value:`, displayValue);
        }
    });
}

// Call populateReviewSection whenever form data changes
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('questionnaire-form');
    if (form) {
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                if (currentStep === totalSteps - 1) {
                    populateReviewSection();
                }
            });
        });
    }
});

// Disable editing in review step
function disableInputsInReviewStep() {
    if (currentStep === totalSteps - 1) {
        const reviewSection = document.getElementById('step-3');
        if (reviewSection) {
            const inputs = reviewSection.querySelectorAll('input:not([type="checkbox"]), select');
            inputs.forEach(input => {
                input.setAttribute('readonly', true);
                input.style.backgroundColor = '#f8f9fa';
                input.style.cursor = 'not-allowed';
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('questionnaire-form');
    if (!form) return;

    let currentStep = 0;
    const steps = document.querySelectorAll('.questionnaire-step');
    const progressBar = document.querySelector('.progress-bar');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');

    // Initialize first step
    showStep(currentStep);

    // Event listeners for navigation buttons
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep--;
                showStep(currentStep);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (validateStep(currentStep)) {
                if (currentStep < steps.length - 1) {
                    currentStep++;
                    showStep(currentStep);
                }
            }
        });
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateStep(currentStep)) return;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Convert checkbox values to boolean
        data.family_history = !!formData.get('family_history');
        data.treatment_history = !!formData.get('treatment_history');

        // Convert numeric strings to numbers
        ['age', 'academic_year', 'cgpa', 'sleep_duration', 'physical_activity', 
         'screen_time', 'academic_pressure', 'social_connectedness', 
         'coping_mechanisms', 'financial_stress', 'dietary_habits'].forEach(field => {
            if (data[field]) {
                data[field] = Number(data[field]);
            }
        });

        try {
            const response = await fetch('/submit-questionnaire', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const result = await response.json();
            window.location.href = '/dashboard';
        } catch (error) {
            console.error('Error:', error);
            showError('There was a problem submitting your questionnaire. Please try again.');
        }
    });

    // Helper functions
    function showStep(step) {
        steps.forEach((s, index) => {
            s.style.display = index === step ? 'block' : 'none';
        });

        // Update buttons
        if (prevBtn) prevBtn.style.display = step === 0 ? 'none' : 'block';
        if (nextBtn) nextBtn.style.display = step === steps.length - 1 ? 'none' : 'block';
        if (submitBtn) submitBtn.style.display = step === steps.length - 1 ? 'block' : 'none';

        // Update progress bar
        if (progressBar) {
            const progress = ((step + 1) / steps.length) * 100;
            progressBar.style.width = progress + '%';
            progressBar.setAttribute('aria-valuenow', progress);
        }
    }

    function validateStep(step) {
        const currentStepElement = steps[step];
        if (!currentStepElement) return true;

        const inputs = currentStepElement.querySelectorAll('input, select');
        let isValid = true;

        inputs.forEach(input => {
            if (input.type === 'checkbox') return; // Skip validation for checkboxes
            
            if (input.hasAttribute('required') && !input.value) {
                isValid = false;
                input.classList.add('is-invalid');
            } else {
                input.classList.remove('is-invalid');
            }

            // Validate numeric ranges
            if (input.type === 'number' || input.type === 'range') {
                const min = parseFloat(input.min);
                const max = parseFloat(input.max);
                const value = parseFloat(input.value);

                if (value < min || value > max) {
                    isValid = false;
                    input.classList.add('is-invalid');
                }
            }
        });

        if (!isValid) {
            showError('Please fill in all required fields correctly.');
        }

        return isValid;
    }

    function showError(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);
        }

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            alertDiv.classList.add('fade-out');
            setTimeout(() => alertDiv.remove(), 300);
        }, 5000);
    }

    // Add input event listeners for validation
    const allInputs = form.querySelectorAll('input, select');
    allInputs.forEach(input => {
        input.addEventListener('input', () => {
            input.classList.remove('is-invalid');
        });
    });

    // Range input value display
    const rangeInputs = form.querySelectorAll('input[type="range"]');
    rangeInputs.forEach(input => {
        const valueDisplay = document.getElementById(`${input.id}-value`);
        if (valueDisplay) {
            valueDisplay.textContent = input.value;
            input.addEventListener('input', () => {
                valueDisplay.textContent = input.value;
            });
        }
    });
});