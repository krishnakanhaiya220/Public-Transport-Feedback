
const $ = (id) => document.getElementById(id);

let currentUser = "";
let selectedRating = 0;

let feedbackData = JSON.parse(localStorage.getItem("transportFeedback")) || [];

const pageNames = {
    dashboard: "Dashboard",
    feedback: "Give Feedback",
    status: "Feedback Status",
    analytics: "Analytics",
    reports: "Reports"
};

function saveFeedback() {
    localStorage.setItem("transportFeedback", JSON.stringify(feedbackData));
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// LOGIN: NAME AND PASSWORD ONLY
$("loginForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const name = $("userName").value.trim();
    const password = $("userPassword").value;

    if (password !== "1234") {
        $("loginError").textContent = "Incorrect password! Please enter 1234.";
        return;
    }

    if (!name) {
        $("loginError").textContent = "Please enter your name.";
        return;
    }

    currentUser = name;

    $("displayName").textContent = currentUser;
    $("topUserName").textContent = currentUser;

    $("loginPage").classList.add("hidden");
    $("mainApp").classList.remove("hidden");

    showPage("dashboard");
});

// LOGOUT
$("logoutBtn").addEventListener("click", function() {
    currentUser = "";

    $("mainApp").classList.add("hidden");
    $("loginPage").classList.remove("hidden");

    $("loginForm").reset();
    $("loginError").textContent = "";

    showPage("dashboard");
});

// PAGE NAVIGATION
function showPage(page) {
    document.querySelectorAll(".page").forEach(section => {
        section.classList.add("hidden");
    });

    $(page + "Page").classList.remove("hidden");
    $("pageTitle").textContent = pageNames[page];

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.toggle("active", button.dataset.page === page);
    });

    if (page === "dashboard") updateDashboard();
    if (page === "status") renderFeedback();
    if (page === "analytics") updateAnalytics();
}

document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", function() {
        showPage(this.dataset.page);
    });
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", function() {
        showPage(this.dataset.go);
    });
});

// STAR RATING
$("starRating").querySelectorAll("button").forEach(button => {
    button.addEventListener("click", function() {
        selectedRating = Number(this.dataset.rating);

        $("starRating").querySelectorAll("button").forEach(star => {
            star.classList.toggle(
                "selected",
                Number(star.dataset.rating) <= selectedRating
            );
        });

        $("ratingText").textContent = selectedRating + " out of 5 stars";
    });
});

// SUBMIT FEEDBACK
$("feedbackForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const file = $("attachment").files[0];

    if (selectedRating === 0) {
        alert("Please select a star rating.");
        return;
    }

    if (file && file.size > 2 * 1024 * 1024) {
        alert("File size must be less than 2 MB.");
        return;
    }

    if (file && !(
        file.type.startsWith("image/") ||
        file.type === "application/pdf"
    )) {
        alert("Only image files and PDF files are allowed.");
        return;
    }

    let attachmentData = "";

    if (file) {
        try {
            attachmentData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        } catch (error) {
            alert("Unable to read the attachment.");
            return;
        }
    }

    const newFeedback = {
        id: "FB" + Date.now(),
        user: currentUser,
        transport: $("transportType").value,
        route: $("route").value.trim(),
        stop: $("stop").value.trim(),
        date: $("travelDate").value,
        category: $("category").value,
        rating: selectedRating,
        message: $("message").value.trim(),
        attachment: attachmentData,
        attachmentName: file ? file.name : "",
        status: "Pending",
        adminReply: "",
        createdAt: new Date().toLocaleString()
    };

    feedbackData.unshift(newFeedback);
    saveFeedback();

    $("feedbackForm").reset();
    selectedRating = 0;

    $("starRating").querySelectorAll("button").forEach(star => {
        star.classList.remove("selected");
    });

    $("ratingText").textContent = "Select your rating";

    $("feedbackMessage").textContent =
        "Your feedback has been submitted successfully! Feedback ID: " + newFeedback.id;

    updateDashboard();

    setTimeout(() => {
        $("feedbackMessage").textContent = "";
    }, 6000);
});

// DASHBOARD
function updateDashboard() {
    $("totalCount").textContent = feedbackData.length;

    $("pendingCount").textContent =
        feedbackData.filter(item => item.status === "Pending").length;

    $("progressCount").textContent =
        feedbackData.filter(item => item.status === "In Progress").length;

    $("resolvedCount").textContent =
        feedbackData.filter(item => item.status === "Resolved").length;

    const recent = feedbackData.slice(0, 5);

    $("recentFeedback").innerHTML = recent.length
        ? recent.map(item => createFeedbackCard(item)).join("")
        : '<div class="empty-message">No feedback submitted yet.</div>';
}

// FEEDBACK CARD
function createFeedbackCard(item) {
    const statusClass = item.status.replace(/\s/g, "-");

    let attachmentHTML = "";

    if (item.attachment) {
        attachmentHTML = `
            <p>📎 Attachment:
                <a href="${item.attachment}" download="${escapeHTML(item.attachmentName)}">
                    ${escapeHTML(item.attachmentName)}
                </a>
            </p>`;
    }

    let replyHTML = item.adminReply
        ? `<p><strong>Admin Response:</strong> ${escapeHTML(item.adminReply)}</p>`
        : "";

    const adminHTML = `
        <div class="admin-controls">
            <label>Update Status</label>
            <select id="status-${item.id}">
                <option value="Pending" ${item.status === "Pending" ? "selected" : ""}>Pending</option>
                <option value="In Progress" ${item.status === "In Progress" ? "selected" : ""}>In Progress</option>
                <option value="Resolved" ${item.status === "Resolved" ? "selected" : ""}>Resolved</option>
            </select>

            <label>Admin Response</label>
            <textarea id="reply-${item.id}" rows="2"
                placeholder="Write your response...">${escapeHTML(item.adminReply)}</textarea>

            <button class="primary-btn" onclick="updateFeedback('${item.id}')">
                Save Changes
            </button>
        </div>`;

    return `
        <div class="feedback-item">
            <div class="feedback-top">
                <div>
                    <h3>${escapeHTML(item.category)}</h3>
                    <div class="feedback-meta">
                        ID: ${escapeHTML(item.id)} |
                        ${escapeHTML(item.createdAt)}
                    </div>
                </div>
                <span class="status-badge ${statusClass}">
                    ${escapeHTML(item.status)}
                </span>
            </div>

            <p><strong>Passenger:</strong> ${escapeHTML(item.user)}</p>
            <p><strong>Transport:</strong> ${escapeHTML(item.transport)}</p>
            <p><strong>Route:</strong> ${escapeHTML(item.route)}</p>
            <p><strong>Stop:</strong> ${escapeHTML(item.stop)}</p>
            <p><strong>Travel Date:</strong> ${escapeHTML(item.date)}</p>
            <p><strong>Rating:</strong>
                <span style="color:#f4b400">${"★".repeat(item.rating)}</span>
                (${item.rating}/5)
            </p>
            <p><strong>Feedback:</strong> ${escapeHTML(item.message)}</p>
            ${attachmentHTML}
            ${replyHTML}
            ${adminHTML}
        </div>`;
}

// FEEDBACK STATUS AND SEARCH
function renderFeedback() {
    const search = $("searchFeedback").value.toLowerCase();
    const status = $("statusFilter").value;

    let data = feedbackData.filter(item => {
        const matchesSearch =
            item.id.toLowerCase().includes(search) ||
            item.route.toLowerCase().includes(search) ||
            item.user.toLowerCase().includes(search) ||
            item.category.toLowerCase().includes(search);

        const matchesStatus =
            status === "All" || item.status === status;

        return matchesSearch && matchesStatus;
    });

    $("allFeedback").innerHTML = data.length
        ? data.map(item => createFeedbackCard(item)).join("")
        : '<div class="empty-message">No matching feedback found.</div>';
}

$("searchFeedback").addEventListener("input", renderFeedback);
$("statusFilter").addEventListener("change", renderFeedback);

// UPDATE FEEDBACK STATUS AND ADMIN RESPONSE
function updateFeedback(id) {
    const item = feedbackData.find(feedback => feedback.id === id);

    if (!item) return;

    item.status = $("status-" + id).value;
    item.adminReply = $("reply-" + id).value.trim();

    saveFeedback();

    renderFeedback();
    updateDashboard();
    updateAnalytics();

    alert("Feedback updated successfully!");
}

// ANALYTICS
function updateAnalytics() {
    const total = feedbackData.length;

    const average = total
        ? feedbackData.reduce((sum, item) => sum + Number(item.rating), 0) / total
        : 0;

    const resolved = feedbackData.filter(
        item => item.status === "Resolved"
    ).length;

    const rate = total ? Math.round((resolved / total) * 100) : 0;

    $("averageRating").textContent = average.toFixed(1) + " ★";
    $("resolutionRate").textContent = rate + "%";

    const statuses = ["Pending", "In Progress", "Resolved"];

    $("statusChart").innerHTML = statuses.map(status => {
        const count = feedbackData.filter(item => item.status === status).length;
        const percent = total ? (count / total) * 100 : 0;

        return `
            <div class="chart-row">
                <div class="chart-label">
                    <span>${status}</span>
                    <strong>${count}</strong>
                </div>
                <div class="chart-track">
                    <div class="chart-fill" style="width:${percent}%"></div>
                </div>
            </div>`;
    }).join("");

    const categories = {};

    feedbackData.forEach(item => {
        categories[item.category] = (categories[item.category] || 0) + 1;
    });

    const categoryEntries = Object.entries(categories);

    $("categoryChart").innerHTML = categoryEntries.length
        ? categoryEntries.map(([category, count]) => {
            const percent = total ? (count / total) * 100 : 0;

            return `
                <div class="chart-row">
                    <div class="chart-label">
                        <span>${escapeHTML(category)}</span>
                        <strong>${count}</strong>
                    </div>
                    <div class="chart-track">
                        <div class="chart-fill" style="width:${percent}%"></div>
                    </div>
                </div>`;
        }).join("")
        : '<p class="empty-message">No feedback data available yet.</p>';
}

// DOWNLOAD CSV REPORT
$("downloadReport").addEventListener("click", function() {
    if (feedbackData.length === 0) {
        alert("No feedback data available to download.");
        return;
    }

    const headers = [
        "Feedback ID",
        "Passenger",
        "Transport",
        "Route",
        "Stop",
        "Travel Date",
        "Category",
        "Rating",
        "Message",
        "Status",
        "Admin Response",
        "Submitted At"
    ];

    function csvCell(value) {
        return '"' + String(value ?? "").replace(/"/g, '""') + '"';
    }

    const rows = feedbackData.map(item => [
        item.id,
        item.user,
        item.transport,
        item.route,
        item.stop,
        item.date,
        item.category,
        item.rating,
        item.message,
        item.status,
        item.adminReply,
        item.createdAt
    ]);

    const csv = [
        headers.map(csvCell).join(","),
        ...rows.map(row => row.map(csvCell).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "Transport_Feedback_Report.csv";
    link.click();

    URL.revokeObjectURL(url);
});

// INITIAL PAGE
updateDashboard();
