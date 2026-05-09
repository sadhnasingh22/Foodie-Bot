document.addEventListener('DOMContentLoaded', () => {
    const readinessForm = document.getElementById('readiness-form');
    const evaluateBtn = document.getElementById('evaluate-btn');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');

    readinessForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            student_name: document.getElementById('student_name').value,
            gate_project_scores: document.getElementById('gate_project_scores').value,
            attendance_percentage: document.getElementById('attendance_percentage').value,
            self_resolution_rate: document.getElementById('self_resolution_rate').value,
            peer_feedback: document.getElementById('peer_feedback').value
        };

        // UI State
        evaluateBtn.disabled = true;
        loading.classList.remove('hidden');
        results.classList.add('hidden');

        try {
            console.log('Chef\'s Special readiness evaluation submitted');
            const response = await fetch('/api/evaluate-readiness', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                renderReadiness(data.evaluation);
            } else {
                alert('Error: ' + (data.error || 'Failed to evaluate readiness'));
            }
        } catch (err) {
            console.error('Fetch error:', err);
            alert('Server error. Please check if the backend is running.');
        } finally {
            loading.classList.add('hidden');
            evaluateBtn.disabled = false;
        }
    });

    function renderReadiness(evaluation) {
        // Tier Display
        const tier = Number(evaluation.readiness_tier ?? evaluation.tier ?? evaluation.feature_tier);
        const tierLabel = evaluation.tier_label || '';
        document.getElementById('res-tier').textContent =
            tierLabel || `Tier ${tier} · Chef's Special readiness`;
        document.getElementById('res-tier-badge').textContent = Number.isFinite(tier) ? String(tier) : '?';
        
        let tierDesc = "";
        let tierColor = "";
        if (tier === 3) {
            tierDesc = "⭐ FEATURED READY – Chef's Special! Promote to the featured menu and alert the Head Chef.";
            tierColor = "#ffc107";
        } else if (tier === 2) {
            tierDesc = "🔄 ALMOST THERE – Minor refinements needed before Chef's Special promotion.";
            tierColor = "var(--warning)";
        } else {
            tierDesc = "⚠️ NEEDS WORK – Not ready for feature; Kitchen Improvement Team should remediate.";
            tierColor = "var(--danger)";
        }
        
        document.getElementById('res-tier-desc').textContent = tierDesc;

        // Recommendations
        document.getElementById('res-report').textContent = evaluation.readiness_report;
        document.getElementById('res-project').textContent = evaluation.recommended_project;
        document.getElementById('res-mentor').textContent = evaluation.mentor_pairing;
        document.getElementById('res-full-report').textContent = evaluation.readiness_report;

        // Skills List
        const skillsList = document.getElementById('res-skills-list');
        skillsList.innerHTML = '';
        (evaluation.skills_to_strengthen || []).forEach(skill => {
            const li = document.createElement('li');
            li.className = 'feedback-item';
            li.textContent = skill;
            skillsList.appendChild(li);
        });

        // Show Results
        results.classList.remove('hidden');
        results.scrollIntoView({ behavior: 'smooth' });
        
        // Dynamic Tier Colors for Banner
        const banner = document.getElementById('tier-banner');
        banner.style.borderColor = tierColor;
        banner.style.background = `linear-gradient(135deg, ${tierColor}22 0%, ${tierColor}05 100%)`;
        
        const badge = document.getElementById('res-tier-badge');
        badge.style.color = tierColor;

        banner.classList.remove('tier-1', 'tier-2', 'tier-3');
        banner.classList.add(tier === 3 ? 'tier-3' : tier === 2 ? 'tier-2' : 'tier-1');
    }
});
