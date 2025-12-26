// ENHANCED AI Quick Decision Function
// Calls the REAL AI engine on port 8001 via backend proxy
async function askAIQuickDecision() {
    const text = document.getElementById('aiInput').value.trim();
    if (!text) {
        UI.showToast('Please describe your leave request first', 'warning');
        return;
    }

    showAIResponse('🤖 Analyzing your request with AI...');

    try {
        const response = await API.post('/leaves/ai-quick-check', { text: text });

        if (!response.success) {
            throw new Error(response.message || 'AI analysis failed');
        }

        // Build comprehensive AI response HTML
        const html = buildAIResponseHTML(response);
        showAIResponse(html);

        // Auto-fill form if AI extracted data
        if (response.leave_type) {
            document.getElementById('leaveType').value = response.leave_type;
        }
        if (response.start_date) {
            document.getElementById('startDate').value = response.start_date;
        }
        if (response.end_date) {
            document.getElementById('endDate').value = response.end_date;
        }
        if (response.professional_reason) {
            document.getElementById('reason').value = response.professional_reason;
        }

        UI.showToast('AI has analyzed your request!', 'success');
    } catch (error) {
        const errorMsg = error.message || 'Failed to connect to AI engine';
        showAIResponse(`❌ <strong>Error:</strong> ${errorMsg}<br><br>Make sure the AI engine is running on port 8001.`);
        UI.showToast('AI analysis failed', 'error');
    }
}

// Build beautiful AI response HTML
function buildAIResponseHTML(data) {
    const { status, confidence, leave_type, start_date, end_date, leave_days,
        balance_before, balance_after, team_capacity, emotional_tone,
        urgency_level, professional_reason, issues, suggestions, processing_time } = data;

    let html = '';

    // Decision Badge
    const decisionColors = {
        'AUTO_APPROVED': { bg: '#10b981', text: '✅ AUTO-APPROVED', icon: '🎉' },
        'ESCALATE_TO_MANAGER': { bg: '#f59e0b', text: '🟡 NEEDS MANAGER REVIEW', icon: '👔' },
        'ESCALATE_TO_HR': { bg: '#f59e0b', text: '🟡 NEEDS HR REVIEW', icon: '👥' },
        'REJECTED': { bg: '#ef4444', text: '❌ NOT RECOMMENDED', icon: '⚠️' },
        'NEEDS_INFO': { bg: '#6b7280', text: 'ℹ️ MORE INFO NEEDED', icon: '❓' }
    };

    const decision = decisionColors[status] || decisionColors['NEEDS_INFO'];

    html += `
        <div style="background: ${decision.bg}20; border: 2px solid ${decision.bg}; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <div style="font-size: 1.5rem; font-weight: 700; color: ${decision.bg}; margin-bottom: 8px;">
                ${decision.icon} ${decision.text}
            </div>
            <div style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">
                AI Confidence: <strong style="color: white;">${confidence}%</strong> | 
                Processing Time: <strong style="color: white;">${processing_time}s</strong>
            </div>
        </div>
    `;

    // Confidence Bar
    const confidenceColor = confidence >= 85 ? '#10b981' : confidence >= 60 ? '#f59e0b' : '#ef4444';
    html += `
        <div style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: rgba(255,255,255,0.8); font-weight: 600;">Confidence Score</span>
                <span style="color: ${confidenceColor}; font-weight: 700;">${confidence}%</span>
            </div>
            <div style="background: rgba(255,255,255,0.1); height: 12px; border-radius: 6px; overflow: hidden;">
                <div style="background: ${confidenceColor}; width: ${confidence}%; height: 100%; transition: width 0.5s ease;"></div>
            </div>
        </div>
    `;

    // Leave Details
    if (leave_type) {
        html += `
            <div style="background: rgba(59, 130, 246, 0.1); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                <div style="font-weight: 700; color: #3b82f6; margin-bottom: 12px; font-size: 1.1rem;">📋 Leave Details</div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; color: rgba(255,255,255,0.9);">
                    <div><strong>Type:</strong> ${leave_type}</div>
                    <div><strong>Days:</strong> ${leave_days} business day(s)</div>
                    <div><strong>Start:</strong> ${start_date}</div>
                    <div><strong>End:</strong> ${end_date}</div>
                    ${balance_before !== null ? `<div><strong>Balance Before:</strong> ${balance_before} days</div>` : ''}
                    ${balance_after !== null ? `<div><strong>Balance After:</strong> ${balance_after} days</div>` : ''}
                </div>
            </div>
        `;
    }

    // Team Impact & Analysis
    if (team_capacity !== undefined || emotional_tone || urgency_level) {
        html += `
            <div style="background: rgba(139, 92, 246, 0.1); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                <div style="font-weight: 700; color: #8b5cf6; margin-bottom: 12px; font-size: 1.1rem;">🧠 AI Analysis</div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; color: rgba(255,255,255,0.9);">
                    ${team_capacity !== undefined ? `<div><strong>Team Capacity:</strong> ${team_capacity}%</div>` : ''}
                    ${emotional_tone ? `<div><strong>Emotional Tone:</strong> ${emotional_tone}</div>` : ''}
                    ${urgency_level ? `<div><strong>Urgency Level:</strong> ${urgency_level}</div>` : ''}
                </div>
            </div>
        `;
    }

    // Professional Reason
    if (professional_reason) {
        html += `
            <div style="background: rgba(16, 185, 129, 0.1); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                <div style="font-weight: 700; color: #10b981; margin-bottom: 8px;">📝 Professional Reason (AI-Rewritten)</div>
                <div style="color: rgba(255,255,255,0.9); font-style: italic;">"${professional_reason}"</div>
            </div>
        `;
    }

    // Issues
    if (issues && issues.length > 0) {
        html += `
            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                <div style="font-weight: 700; color: #ef4444; margin-bottom: 12px;">⚠️ Concerns Detected</div>
                <ul style="margin: 0; padding-left: 20px; color: rgba(255,255,255,0.9);">
                    ${issues.map(issue => `<li style="margin-bottom: 6px;">${issue}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // Suggestions
    if (suggestions && suggestions.length > 0) {
        html += `
            <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                <div style="font-weight: 700; color: #3b82f6; margin-bottom: 12px;">💡 AI Suggestions</div>
                <ul style="margin: 0; padding-left: 20px; color: rgba(255,255,255,0.9);">
                    ${suggestions.map(suggestion => `<li style="margin-bottom: 6px;">${suggestion}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // Action Buttons
    if (status === 'AUTO_APPROVED') {
        html += `
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="document.getElementById('leaveForm').requestSubmit()" style="padding: 14px 32px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 12px; color: white; font-weight: 600; cursor: pointer; font-size: 1rem;">
                    ✅ Confirm & Submit Request
                </button>
            </div>
        `;
    } else if (status.includes('ESCALATE')) {
        html += `
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="document.getElementById('leaveForm').requestSubmit()" style="padding: 14px 32px; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; border-radius: 12px; color: white; font-weight: 600; cursor: pointer; font-size: 1rem;">
                    📤 Submit for Review
                </button>
            </div>
        `;
    }

    return html;
}
