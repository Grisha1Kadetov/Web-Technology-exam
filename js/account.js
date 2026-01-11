const ORDERS_PER_PAGE = 5;

let coursesMap = {};
let tutorsMap = {};
let orders = [];
let currentOrdersPage = 1;
let editingOrder = null;
let deletingOrderId = null;

function showAlert(message, type = "success") {
    const container = document.getElementById("global-notifications");
    const wrap = document.createElement("div");
    wrap.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    container.prepend(wrap);
    setTimeout(() => {
        const a = wrap.querySelector(".alert");
        if (a) bootstrap.Alert.getOrCreateInstance(a).close();
    }, 5000);
}

async function apiGet(path) {
    const res = await fetch(`${API_URL}${path}?api_key=${API_KEY}`);
    if (!res.ok) throw new Error("network");
    return res.json();
}
async function apiPut(path, body) {
    const res = await fetch(`${API_URL}${path}?api_key=${API_KEY}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error((j && j.error) || "Ошибка сервера");
    }
    return res.json();
}
async function apiDelete(path) {
    const res = await fetch(`${API_URL}${path}?api_key=${API_KEY}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Ошибка удаления");
    return res.json();
}

function closeAllModals() {
    document.querySelectorAll(".modal.show").forEach(m => {
        const inst = bootstrap.Modal.getInstance(m);
        if (inst) inst.hide();
    });
}

async function fetchCourses() {
    try {
        const data = await apiGet("courses");
        data.forEach(c => coursesMap[c.id] = c);
    } catch { showAlert("Ошибка загрузки курсов", "danger"); }
}

async function fetchTutors() {
    try {
        const data = await apiGet("tutors");
        data.forEach(t => tutorsMap[t.id] = t);
    } catch { showAlert("Ошибка загрузки репетиторов", "danger"); }
}

async function fetchOrders() {
    try {
        orders = await apiGet("orders");
        currentOrdersPage = 1;
        renderOrders();
    } catch { showAlert("Ошибка загрузки заявок", "danger"); }
}

function escapeHtml(str) { if (!str) return ""; return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s])); }

function calculatePriceFrom(order) {
    const course = coursesMap[order.course_id] || {};
    if (order.tutor_id && order.tutor_id !== 0) {
        const tutor = tutorsMap[order.tutor_id] || {};
        const hours = Number(order.duration || 1);
        return Math.round((tutor.price_per_hour || 0) * hours);
    }
    const courseFee = course.course_fee_per_hour || 0;
    const hours = (course.total_length || 0) * (course.week_length || 0);
    let price = courseFee * hours;
    if (order.date_start) {
        const day = new Date(order.date_start).getDay();
        if (day === 0 || day === 6) price *= 1.5;
    }
    if (order.time_start >= "09:00" && order.time_start <= "12:00") price += 400;
    if (order.time_start >= "18:00" && order.time_start <= "20:00") price += 1000;
    if ((course.week_length || 0) >= 5 || order.intensive_course) price *= 1.2;
    if (order.supplementary) price += 2000 * (order.persons || 1);
    if (order.personalized) price += 1500 * (course.total_length || 0);
    if (order.excursions) price *= 1.25;
    if (order.assessment) price += 300;
    if (order.interactive) price *= 1.5;
    if ((order.persons || 1) >= 5) price *= 0.85;
    if (order.date_start) {
        const start = new Date(order.date_start);
        const now = new Date();
        const diff = (start - now) / (1000 * 60 * 60 * 24);
        if (diff >= 30) price *= 0.9;
    }
    return Math.round(price * (order.persons || 1));
}

function renderOrders() {
    const tbody = document.getElementById("orders-tbody");
    tbody.innerHTML = "";
    const start = (currentOrdersPage - 1) * ORDERS_PER_PAGE;
    const page = orders.slice(start, start + ORDERS_PER_PAGE);
    page.forEach((o, i) => {
        const tr = document.createElement("tr");
        const isTutorOrder = o.tutor_id && o.tutor_id !== 0;
        const title = isTutorOrder ? (tutorsMap[o.tutor_id]?.name || `tutor#${o.tutor_id}`) : (coursesMap[o.course_id]?.name || `course#${o.course_id}`);
        const date = o.date_start || "";
        const time = o.time_start || "";
        const price = o.price || calculatePriceFrom(o);
        tr.innerHTML = `<td>${start + i + 1}</td><td>${escapeHtml(title)}</td><td>${escapeHtml(date)}</td><td>${escapeHtml(time)}</td><td class="fw-bold">${price}</td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-primary view-btn" data-id="${o.id}">Подробнее</button>
                    <button class="btn btn-sm btn-outline-secondary edit-btn" data-id="${o.id}">Изменить</button>
                    <button class="btn btn-sm btn-outline-danger del-btn" data-id="${o.id}">Удалить</button>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });
    renderPagination();
    bindTableActions();
}

function renderPagination() {
    const pages = Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE));
    const container = document.getElementById("orders-pagination");
    container.innerHTML = "";
    for (let i = 1; i <= pages; i++) {
        const li = document.createElement("li");
        li.className = `page-item ${i === currentOrdersPage ? "active" : ""}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.addEventListener("click", e => { e.preventDefault(); currentOrdersPage = i; renderOrders(); });
        container.appendChild(li);
    }
}

function bindTableActions() {
    document.querySelectorAll(".view-btn").forEach(b => b.addEventListener("click", () => {
        const id = Number(b.dataset.id); openDetails(id);
    }));
    document.querySelectorAll(".edit-btn").forEach(b => b.addEventListener("click", () => {
        const id = Number(b.dataset.id); openEdit(id);
    }));
    document.querySelectorAll(".del-btn").forEach(b => b.addEventListener("click", () => {
        const id = Number(b.dataset.id); openDelete(id);
    }));
}

function openDetails(orderId) {
    closeAllModals();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const course = coursesMap[order.course_id] || {};
    const tutor = tutorsMap[order.tutor_id] || {};
    const title = (order.tutor_id && order.tutor_id !== 0) ? (`Запись к ${tutor.name || 'репетитору'}`) : (`Запись на курс ${course.name || ''}`);
    const body = [];
    body.push(`<p><strong>Дата:</strong> ${escapeHtml(order.date_start || "")}</p>`);
    body.push(`<p><strong>Время:</strong> ${escapeHtml(order.time_start || "")}</p>`);
    if (course.name) body.push(`<p><strong>Курс:</strong> ${escapeHtml(course.name)}</p>`);
    if (course.description) body.push(`<p><strong>Описание курса:</strong> ${escapeHtml(course.description)}</p>`);
    if (tutor.name) body.push(`<p><strong>Репетитор:</strong> ${escapeHtml(tutor.name)}</p>`);
    const breakdown = [];
    if (order.supplementary) breakdown.push("Доп. материалы");
    if (order.personalized) breakdown.push("Индивидуальные занятия");
    if (order.excursions) breakdown.push("Экскурсии");
    if (order.assessment) breakdown.push("Оценка уровня");
    if (order.interactive) breakdown.push("Онлайн-платформа");
    if (breakdown.length) body.push(`<p><strong>Опции:</strong> ${escapeHtml(breakdown.join(", "))}</p>`);
    body.push(`<p class="fw-bold">Итоговая стоимость: ${calculatePriceFrom(order)} ₽</p>`);
    document.getElementById("details-title").textContent = title;
    document.getElementById("details-body").innerHTML = body.join("");
    new bootstrap.Modal(document.getElementById("detailsModal")).show();
}

function openEdit(orderId) {
    closeAllModals();
    editingOrder = orders.find(o => o.id === orderId);
    if (!editingOrder) return;
    const isTutorOrder = editingOrder.tutor_id && editingOrder.tutor_id !== 0;
    if (isTutorOrder) openEditTutor();
    else openEditCourse();
}

function openEditCourse() {
    const order = editingOrder;
    document.getElementById("edit-course-name").value = coursesMap[order.course_id]?.name || "";
    document.getElementById("edit-course-tutor").value = tutorsMap[order.tutor_id]?.name || (order.tutor_id ? `#${order.tutor_id}` : "");
    document.getElementById("edit-course-date").value = order.date_start || "";
    fillTimes("edit-course-time");
    document.getElementById("edit-course-time").value = order.time_start || "";
    document.getElementById("edit-course-persons").value = order.persons || 1;
    document.getElementById("edit-course-supplementary").checked = !!order.supplementary;
    document.getElementById("edit-course-personalized").checked = !!order.personalized;
    document.getElementById("edit-course-excursions").checked = !!order.excursions;
    document.getElementById("edit-course-assessment").checked = !!order.assessment;
    document.getElementById("edit-course-interactive").checked = !!order.interactive;
    updateCourseEditPrice();
    ["edit-course-date", "edit-course-time", "edit-course-persons", "edit-course-supplementary", "edit-course-personalized", "edit-course-excursions", "edit-course-assessment", "edit-course-interactive"].forEach(id => {
        const el = document.getElementById(id); if (el) el.onchange = updateCourseEditPrice;
    });
    new bootstrap.Modal(document.getElementById("editCourseModal")).show();
}

function openEditTutor() {
    const order = editingOrder;
    document.getElementById("edit-tutor-name").value = tutorsMap[order.tutor_id]?.name || "";
    document.getElementById("edit-tutor-duration").value = order.duration || 1;
    document.getElementById("edit-tutor-date").value = order.date_start || "";
    fillTimes("edit-tutor-time");
    document.getElementById("edit-tutor-time").value = order.time_start || "";
    document.getElementById("edit-tutor-email").value = order.email || "";
    document.getElementById("edit-tutor-message").value = order.message || "";
    updateTutorEditPrice();
    ["edit-tutor-duration", "edit-tutor-date", "edit-tutor-time"].forEach(id => {
        const el = document.getElementById(id); if (el) el.onchange = updateTutorEditPrice;
    });
    new bootstrap.Modal(document.getElementById("editTutorModal")).show();
}

function fillTimes(selectId) {
    const select = document.getElementById(selectId);
    select.innerHTML = "";
    for (let h = 9; h <= 20; h++) {
        const t = `${String(h).padStart(2, "0")}:00`;
        select.innerHTML += `<option value="${t}">${t}</option>`;
    }
}

function updateCourseEditPrice() {
    if (!editingOrder) return;
    const copy = Object.assign({}, editingOrder);
    copy.date_start = document.getElementById("edit-course-date").value;
    copy.time_start = document.getElementById("edit-course-time").value;
    copy.persons = Number(document.getElementById("edit-course-persons").value) || 1;
    copy.supplementary = document.getElementById("edit-course-supplementary").checked;
    copy.personalized = document.getElementById("edit-course-personalized").checked;
    copy.excursions = document.getElementById("edit-course-excursions").checked;
    copy.assessment = document.getElementById("edit-course-assessment").checked;
    copy.interactive = document.getElementById("edit-course-interactive").checked;
    document.getElementById("edit-course-total").textContent = calculatePriceFrom(copy);
}

function updateTutorEditPrice() {
    if (!editingOrder) return;
    const tutor = tutorsMap[editingOrder.tutor_id] || {};
    let hours = Number(document.getElementById("edit-tutor-duration").value) || 1;
    if (hours < 1) hours = 1; if (hours > 40) hours = 40;
    document.getElementById("edit-tutor-duration").value = hours;
    document.getElementById("edit-tutor-total").textContent = Math.round((tutor.price_per_hour || 0) * hours);
}

async function saveCourseEdit() {
    if (!editingOrder) return;
    const payload = {
        date_start: document.getElementById("edit-course-date").value,
        time_start: document.getElementById("edit-course-time").value,
        persons: Number(document.getElementById("edit-course-persons").value) || 1,
        supplementary: document.getElementById("edit-course-supplementary").checked,
        personalized: document.getElementById("edit-course-personalized").checked,
        excursions: document.getElementById("edit-course-excursions").checked,
        assessment: document.getElementById("edit-course-assessment").checked,
        interactive: document.getElementById("edit-course-interactive").checked
    };
    try {
        const updated = await apiPut(`orders/${editingOrder.id}`, payload);
        const idx = orders.findIndex(o => o.id === updated.id);
        if (idx !== -1) orders[idx] = updated;
        new bootstrap.Modal(document.getElementById("editCourseModal")).hide();
        renderOrders();
        showAlert("Заявка на курс обновлена", "success");
    } catch (e) { showAlert("Ошибка обновления: " + e.message, "danger"); }
}

async function saveTutorEdit() {
    if (!editingOrder) return;
    const payload = {
        date_start: document.getElementById("edit-tutor-date").value,
        time_start: document.getElementById("edit-tutor-time").value,
        duration: Number(document.getElementById("edit-tutor-duration").value) || 1,
        price: Number(document.getElementById("edit-tutor-total").textContent) || 0,
        email: document.getElementById("edit-tutor-email").value || undefined,
        message: document.getElementById("edit-tutor-message").value || undefined
    };
    try {
        const updated = await apiPut(`orders/${editingOrder.id}`, payload);
        const idx = orders.findIndex(o => o.id === updated.id);
        if (idx !== -1) orders[idx] = updated;
        new bootstrap.Modal(document.getElementById("editTutorModal")).hide();
        renderOrders();
        showAlert("Заявка к репетитору обновлена", "success");
    } catch (e) { showAlert("Ошибка обновления: " + e.message, "danger"); }
}

function openDelete(orderId) {
    deletingOrderId = orderId;
    closeAllModals();
    new bootstrap.Modal(document.getElementById("deleteConfirmModal")).show();
}

async function confirmDelete() {
    if (!deletingOrderId) return;
    try {
        const res = await apiDelete(`orders/${deletingOrderId}`);
        orders = orders.filter(o => o.id !== res.id);
        new bootstrap.Modal(document.getElementById("deleteConfirmModal")).hide();
        renderOrders();
        showAlert("Заявка удалена", "success");
    } catch (e) { showAlert("Ошибка удаления", "danger"); }
    deletingOrderId = null;
}

document.addEventListener("DOMContentLoaded", () => {
    Promise.resolve().then(() => fetchCourses()).then(() => fetchTutors()).then(() => fetchOrders());
    document.getElementById("refresh-orders").addEventListener("click", fetchOrders);
    document.getElementById("save-course-edit").addEventListener("click", saveCourseEdit);
    document.getElementById("save-tutor-edit").addEventListener("click", saveTutorEdit);
    document.getElementById("confirm-delete-btn").addEventListener("click", confirmDelete);
});
