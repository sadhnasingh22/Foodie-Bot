document.addEventListener('DOMContentLoaded', () => {
  const evalForm = document.getElementById('eval-form');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');
  
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('submission_file');
  const uploadFilename = document.getElementById('upload-filename');
  
  const resultsSection = document.getElementById('results-section');
  const submissionSection = document.getElementById('submission-section');
  
  const scoreValue = document.getElementById('score-value');
  const ringFill = document.getElementById('ring-fill');
  const recBadge = document.getElementById('recommendation-badge');
  const scoreSummary = document.getElementById('score-summary');
  const feedbackText = document.getElementById('feedback-message-text');
  const criteriaGrid = document.getElementById('criteria-grid');
  
  const errorBanner = document.getElementById('error-banner');
  const errorMsg = document.getElementById('error-msg');
  
  const btnNewEval = document.getElementById('btn-new-eval');
  const btnCopyFeedback = document.getElementById('btn-copy-feedback');

  // File Upload Handling
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      uploadFilename.textContent = `Selected: ${e.target.files[0].name}`;
      uploadFilename.style.display = 'block';
    }
  });

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      uploadFilename.textContent = `Selected: ${e.dataTransfer.files[0].name}`;
      uploadFilename.style.display = 'block';
    }
  });

  // Form Submission
  evalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(evalForm);
    console.log('Dining experience submission started');
    
    // Basic validation
    const text = formData.get('submission_text');
    const file = formData.get('submission_file');
    
    if (!text && (!file || file.size === 0)) {
      showError('Please provide a submission (text or file).');
      return;
    }

    // UI Loading State
    setLoading(true);
    hideError();

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Evaluation failed');
      }

      console.log('Dining experience evaluation received');
      renderResults(data.evaluation);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  });

  // UI State Helpers
  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    if (isLoading) {
      btnText.style.display = 'none';
      btnLoading.style.display = 'flex';
    } else {
      btnText.style.display = 'flex';
      btnLoading.style.display = 'none';
    }
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    errorBanner.style.display = 'flex';
    errorBanner.scrollIntoView({ behavior: 'smooth' });
  }

  function hideError() {
    errorBanner.style.display = 'none';
  }

  // Result Rendering
  function renderResults(evaluation) {
    // Hide form, show results
    submissionSection.style.display = 'none';
    resultsSection.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Overall Score
    const score =
      evaluation.overall_score ??
      evaluation.experience_score ??
      0;
    scoreValue.textContent = score;
    
    // Animate Ring
    const circumference = 326.7; // 2 * PI * 52
    const offset = circumference - (score / 10) * circumference;
    ringFill.style.strokeDashoffset = offset;

    // Recommendation
    recBadge.textContent = evaluation.recommendation;
    recBadge.className = 'recommendation-badge';
    if (evaluation.recommendation === 'Pass') recBadge.classList.add('badge-pass');
    else if (evaluation.recommendation === 'Revise') recBadge.classList.add('badge-revise');
    else recBadge.classList.add('badge-redo');

    scoreSummary.textContent = evaluation.recommendation_reason || evaluation.summary;
    feedbackText.textContent = evaluation.feedback_message;

    // Criteria Breakdown
    criteriaGrid.innerHTML = '';
    const criteriaList = Array.isArray(evaluation.criteria)
      ? evaluation.criteria
      : [];
    criteriaList.forEach(c => {
      const card = document.createElement('div');
      card.className = 'criterion-card';
      
      card.innerHTML = `
        <div class="criterion-top">
          <span class="criterion-name">${c.name}</span>
          <span class="criterion-score">${c.score}/10</span>
        </div>
        <div class="criterion-details">${c.details}</div>
        <div class="feedback-lists">
          <div class="feedback-list positives">
            <h4>Highlights</h4>
            <ul class="feedback-items">
              ${(c.positives || []).map(p => `<li class="feedback-item">${p}</li>`).join('')}
            </ul>
          </div>
          <div class="feedback-list improvements">
            <h4>Quality refinements</h4>
            <ul class="feedback-items">
              ${(c.improvements || []).map(i => `<li class="feedback-item">${i}</li>`).join('')}
            </ul>
          </div>
        </div>
      `;
      criteriaGrid.appendChild(card);
    });
  }

  // Action Buttons
  btnNewEval.addEventListener('click', () => {
    resultsSection.style.display = 'none';
    submissionSection.style.display = 'block';
    evalForm.reset();
    uploadFilename.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  btnCopyFeedback.addEventListener('click', () => {
    const text = feedbackText.textContent;
    navigator.clipboard.writeText(text).then(() => {
      const originalText = btnCopyFeedback.textContent;
      btnCopyFeedback.textContent = '✅ Copied!';
      setTimeout(() => {
        btnCopyFeedback.textContent = originalText;
      }, 2000);
    });
  });
});
