document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('mentalHealthForm');
    const steps = document.querySelectorAll('.questionnaire-step');
    const stepIndicators = document.querySelectorAll('.step');
    const progressBar = document.querySelector('.progress-bar');
    const prevBtn = document.getElementById('prevButton');
    const nextBtn = document.getElementById('nextButton');
    const submitBtn = document.getElementById('submitButton');
    
    let currentStep = 0;
    
    function updateUI() {
        // Update step visibility
        steps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
        });
        
        // Update step indicators
        stepIndicators.forEach((indicator, index) => {
            if (index < currentStep) {
                indicator.classList.add('completed');
                indicator.classList.remove('active');
            } else if (index === currentStep) {
                indicator.classList.add('active');
                indicator.classList.remove('completed');
            } else {
                indicator.classList.remove('completed', 'active');
            }
        });
        
        // Update progress bar
        const progress = ((currentStep + 1) / steps.length) * 100;
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
        
        // Update button visibility
        prevBtn.style.display = currentStep === 0 ? 'none' : 'block';
        nextBtn.style.display = currentStep === steps.length - 1 ? 'none' : 'block';
        submitBtn.style.display = currentStep === steps.length - 1 ? 'block' : 'none';
    }
    
    function validateCurrentStep() {
        const currentStepElement = steps[currentStep];
        const inputs = currentStepElement.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.classList.add('is-invalid');
                
                // Create or update feedback message
                let feedback = input.nextElementSibling;
                if (!feedback || !feedback.classList.contains('invalid-feedback')) {
                    feedback = document.createElement('div');
                    feedback.className = 'invalid-feedback';
                    input.parentNode.insertBefore(feedback, input.nextSibling);
                }
                feedback.textContent = 'This field is required';
            } else {
                input.classList.remove('is-invalid');
                const feedback = input.nextElementSibling;
                if (feedback && feedback.classList.contains('invalid-feedback')) {
                    feedback.remove();
                }
            }
        });
        
        return isValid;
    }
    
    function showAlert(message, type = 'danger') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        const container = document.querySelector('.container');
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => {
            alertDiv.classList.add('fade-out');
            setTimeout(() => alertDiv.remove(), 300);
        }, 3000);
    }
    
    // Event listeners for next/prev navigation
    nextBtn.addEventListener('click', function() {
        if (validateCurrentStep()) {
            currentStep++;
            updateUI();
        }
    });
    
    prevBtn.addEventListener('click', function() {
        currentStep--;
        updateUI();
    });
    
    // Form submission handler
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validateCurrentStep()) {
            return;
        }
        
        const formData = new FormData(form);
        const submitButton = document.getElementById('submitButton');
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        
        try {
            const response = await fetch('/predict', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const result = await response.json();
            window.location.href = `/result/${result.prediction_id}`;
        } catch (error) {
            console.error('Error:', error);
            showAlert('An error occurred while processing your submission. Please try again.');
            submitButton.disabled = false;
            submitButton.innerHTML = 'Submit';
        }
    });
    
    // Handle real-time validation
    document.querySelectorAll('input, select, textarea').forEach(input => {
        input.addEventListener('input', function() {
            if (this.hasAttribute('required')) {
                if (!this.value.trim()) {
                    this.classList.add('is-invalid');
                } else {
                    this.classList.remove('is-invalid');
                    const feedback = this.nextElementSibling;
                    if (feedback && feedback.classList.contains('invalid-feedback')) {
                        feedback.remove();
                    }
                }
            }
        });
    });
    
    // Handle range input updates
    document.querySelectorAll('input[type="range"]').forEach(range => {
        const output = document.createElement('output');
        output.className = 'range-value';
        range.parentNode.insertBefore(output, range.nextSibling);
        
        function updateOutput() {
            output.textContent = range.value;
        }
        
        range.addEventListener('input', updateOutput);
        updateOutput(); // Initial value
    });
    
    // Initialize the UI
    updateUI();
});