let allMembers = [];
let lastMemberCount = 0;

// Load members on page load
document.addEventListener('DOMContentLoaded', function () {
    loadMembers();
    // Auto-refresh every 30 seconds
    setInterval(autoRefresh, 30000);
});

// Search functionality
document.getElementById('searchBox').addEventListener('input', function (e) {
    const searchTerm = e.target.value.toLowerCase();
    filterMembers(searchTerm);
});

async function loadMembers() {
    try {
        // ✅ FIXED: Changed from '/api/members' to '/api/admin/members'
        const response = await fetch('/api/v2/members');
        const members = await response.json();

        allMembers = members;
        displayMembers(members);
        updateStats(members);

        // Check for new members
        if (lastMemberCount > 0 && members.length > lastMemberCount) {
            showRefreshIndicator();
        }
        lastMemberCount = members.length;

    } catch (error) {
        console.error('Error loading members:', error);
        document.getElementById('membersTableBody').innerHTML = `
            <tr>
                <td colspan="5" class="loading" style="color: #f56565;">
                    ❌ Error loading members. Please refresh the page.
                </td>
            </tr>
        `;
    }
}

async function autoRefresh() {
    try {
        // ✅ FIXED: Changed from '/api/count' to '/api/admin/count'
        const response = await fetch('/api/v2/members/count');
        const data = await response.json();

        if (data.count > lastMemberCount) {
            loadMembers();
        }
    } catch (error) {
        console.log('Auto-refresh failed:', error);
    }
}

function displayMembers(members) {
    const tbody = document.getElementById('membersTableBody');

    if (members.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    🎓 No members yet. Share the registration link to get started!
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = members.map(member => `
        <tr>
            <td><strong>${member.name}</strong></td>
            <td><span class="year-badge">${member.year}</span></td>
            <td>${member.course}</td>
            <td class="email">${member.email}</td>
            <td class="date">${formatDate(member.joinedAt)}</td>
        </tr>
    `).join('');
}

function filterMembers(searchTerm) {
    if (!searchTerm) {
        displayMembers(allMembers);
        return;
    }

    const filtered = allMembers.filter(member =>
        member.name.toLowerCase().includes(searchTerm) ||
        member.email.toLowerCase().includes(searchTerm) ||
        member.course.toLowerCase().includes(searchTerm) ||
        member.year.toLowerCase().includes(searchTerm)
    );

    displayMembers(filtered);
}

function updateStats(members) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const todayMembers = members.filter(member =>
        new Date(member.joinedAt) >= today
    ).length;

    const thisWeekMembers = members.filter(member =>
        new Date(member.joinedAt) >= weekAgo
    ).length;

    document.getElementById('totalMembers').textContent = members.length;
    document.getElementById('todayMembers').textContent = todayMembers;
    document.getElementById('thisWeekMembers').textContent = thisWeekMembers;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showRefreshIndicator() {
    const indicator = document.getElementById('refreshIndicator');
    indicator.classList.add('show');

    setTimeout(() => {
        indicator.classList.remove('show');
    }, 3000);
}

async function exportCSV() {
    try {
        // ✅ FIXED: Changed from '/api/export/csv' to '/api/admin/export/csv'
        const response = await fetch('/api/v2/members/export/csv');
        if (!response.ok) {
            const msg = await response.text();
            throw new Error(msg || `Export failed with status ${response.status}`);
        }

        const blob = await response.blob();

        // Try to use filename from Content-Disposition; fallback to a default
        let filename = 'members.csv';
        const cd = response.headers.get('Content-Disposition');
        if (cd && cd.includes('filename=')) {
            const match = cd.match(/filename\*?=(?:UTF-8''|")?([^";\n]+)/i);
            if (match && match[1]) filename = decodeURIComponent(match[1]);
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); // Firefox needs it in the DOM
        a.click(); // trigger download
        a.remove(); // cleanup
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error('CSV export failed:', err);
        alert('CSV export failed. Please try again.');
    }
}