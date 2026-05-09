document.addEventListener('DOMContentLoaded', () => {
    const reportForm = document.getElementById('report-form');
    const generateBtn = document.getElementById('generate-btn');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const scoreRingFill = document.getElementById('score-ring-fill');

    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        console.log('Weekly restaurant performance report requested');

        const formData = {
            student_name: document.getElementById('student_name').value,
            week_number: document.getElementById('week_number').value,
            attendance: document.getElementById('attendance').value,
            assignment_scores: document.getElementById('assignment_scores').value,
            doubt_history: document.getElementById('doubt_history').value,
            milestone_progress: document.getElementById('milestone_progress').value
        };

        // UI State
        generateBtn.disabled = true;
        loading.classList.remove('hidden');
        results.classList.add('hidden');

        try {
            const response = await fetch('/api/generate-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                console.log('Restaurant performance report received');
                renderReport(data.report);
            } else {
                alert('Error: ' + (data.error || 'Failed to generate report'));
            }
        } catch (err) {
            console.error('Fetch error:', err);
            alert('Server error. Please check if the backend is running.');
        } finally {
            loading.classList.add('hidden');
            generateBtn.disabled = false;
        }
    });

    function renderReport(report) {
        document.getElementById('res-student-name').textContent = `${report.student_name} — ${report.week}`;
        document.getElementById('res-score').textContent = report.progress_score;
        document.getElementById('res-summary').textContent = report.summary;
        document.getElementById('res-encouragement').textContent = report.encouragement;
        document.getElementById('res-snippet').textContent = report.report_snippet;

        const focusList = document.getElementById('res-focus-list');
        focusList.innerHTML = '';
        (report.next_week_focus || []).forEach(item => {
            const li = document.createElement('li');
            li.className = 'feedback-item';
            li.textContent = item;
            focusList.appendChild(li);
        });

        // Animate score ring
        const score = report.progress_score;
        const circumference = 2 * Math.PI * 52; // r=52 from SVG
        const offset = circumference - (score / 100) * circumference;
        
        // Reset and then animate
        scoreRingFill.style.strokeDashoffset = circumference;
        
        results.classList.remove('hidden');
        results.scrollIntoView({ behavior: 'smooth' });

        // Small timeout to trigger animation after visibility
        setTimeout(() => {
            scoreRingFill.style.strokeDashoffset = offset;
        }, 100);
    }
});
