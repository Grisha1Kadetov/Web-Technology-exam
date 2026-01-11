const COURSES_PER_PAGE = 6;

let allCourses = [];
let visibleCourses = [];
let currentPage = 1;
let selectedCourseForOrder = null;

async function fetchCourses() {
    const response = await fetch(`${API_URL}courses?api_key=${API_KEY}`);
    allCourses = await response.json();
    visibleCourses = allCourses;
    render();
}

function applyFilters() {
    const nameEl = document.getElementById("search-name");
    const levelEl = document.getElementById("search-level");
    const nameValue = nameEl ? nameEl.value.toLowerCase() : "";
    const levelValue = levelEl ? levelEl.value : "";

    visibleCourses = allCourses.filter(course => {
        const byName = course.name.toLowerCase().includes(nameValue);
        const byLevel = levelValue === "" ? true : course.level === levelValue;
        return byName && byLevel;
    });

    currentPage = 1;
    render();
}

function resetFilters() {
    const nameEl = document.getElementById("search-name");
    const levelEl = document.getElementById("search-level");
    if (nameEl) nameEl.value = "";
    if (levelEl) levelEl.value = "";

    visibleCourses = allCourses;
    currentPage = 1;
    render();
}

function render() {
    renderCourses();
    renderPagination();
}

function renderCourses() {
    const container = document.getElementById("courses-container");
    if (!container) return;
    container.innerHTML = "";

    const start = (currentPage - 1) * COURSES_PER_PAGE;
    const end = start + COURSES_PER_PAGE;

    visibleCourses.slice(start, end).forEach(course => {
        const col = document.createElement("div");
        col.className = "col-md-4 mb-4";

        col.innerHTML = `
            <div class="card course-card h-100">
                <div class="card-body">
                    <h5 class="card-title">${course.name}</h5>
                    <p class="card-text">
                        Уровень: ${course.level}<br>
                        Преподаватель: ${course.teacher}
                    </p>
                    <button class="btn-primary-custom course-details-btn">
                        Подробнее
                    </button>
                </div>
            </div>
        `;

        const btn = col.querySelector(".course-details-btn");
        if (btn) btn.addEventListener("click", () => openCourseModal(course));

        container.appendChild(col);
    });
}

function renderPagination() {
    const pagination = document.getElementById("courses-pagination");
    if (!pagination) return;
    pagination.innerHTML = "";

    const pages = Math.ceil(visibleCourses.length / COURSES_PER_PAGE);
    if (pages <= 1) return;

    for (let i = 1; i <= pages; i++) {
        const li = document.createElement("li");
        li.className = `page-item ${i === currentPage ? "active" : ""}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.addEventListener("click", e => {
            e.preventDefault();
            currentPage = i;
            render();
        });
        pagination.appendChild(li);
    }
}

function openCourseModal(course) {
    const titleEl = document.getElementById("courseModalTitle");
    const bodyEl = document.getElementById("courseModalBody");
    if (titleEl) titleEl.textContent = course.name;
    if (bodyEl) {
        bodyEl.innerHTML = `
            <p><strong>Описание:</strong> ${course.description}</p>
            <p><strong>Уровень:</strong> ${course.level}</p>
            <p><strong>Преподаватель:</strong> ${course.teacher}</p>
            <p><strong>Длительность:</strong> ${course.total_length} недель</p>
            <p><strong>Часов в неделю:</strong> ${course.week_length}</p>
            <p><strong>Стоимость:</strong> ${course.course_fee_per_hour} ₽ / час</p>
            <p><strong>Даты начала:</strong></p>
            <ul>
                ${course.start_dates.map(date => `<li>${new Date(date).toLocaleString()}</li>`).join("")}
            </ul>
        `;
    }

    const enrollButton = document.getElementById("courseEnrollButton");
    if (enrollButton) enrollButton.dataset.courseId = course.id;

    const modalEl = document.getElementById("courseModal");
    if (modalEl) new bootstrap.Modal(modalEl).show();
}

function openCourseOrderModal(course) {
    selectedCourseForOrder = course;

    const nameEl = document.getElementById("order-course-name");
    const teacherEl = document.getElementById("order-course-teacher");
    const durationEl = document.getElementById("order-duration-info");
    const dateSelect = document.getElementById("order-date-start");
    const timeSelect = document.getElementById("order-time-start");

    if (nameEl) nameEl.value = course.name;
    if (teacherEl) teacherEl.value = course.teacher;
    if (durationEl) durationEl.value = `${course.total_length} недель (${course.week_length} ч/нед)`;

    if (dateSelect) {
        dateSelect.innerHTML = `<option value="">Выберите дату</option>`;
        const dates = [...new Set(course.start_dates.map(d => d.split("T")[0]))];
        dates.forEach(date => {
            dateSelect.innerHTML += `<option value="${date}">${date}</option>`;
        });
    }

    if (timeSelect) {
        timeSelect.innerHTML = "";
        timeSelect.disabled = true;
    }

    calculateCoursePrice();

    const modalEl = document.getElementById("courseOrderModal");
    if (modalEl) new bootstrap.Modal(modalEl).show();
}

//как я понял Опции заказа применяються только для курсов,
//для репетиторов нет такого функционала, поэтому ниже только для курсов
function calculateCoursePrice() {
    if (!selectedCourseForOrder) return;

    clearOrderNotifications();

    const personsEl = document.getElementById("order-persons");
    const dateEl = document.getElementById("order-date-start");
    const timeEl = document.getElementById("order-time-start");

    const persons = personsEl ? Number(personsEl.value) : 1;
    const date = dateEl ? dateEl.value : "";
    const time = timeEl ? timeEl.value : "";

    const hours = selectedCourseForOrder.total_length * selectedCourseForOrder.week_length;
    let price = selectedCourseForOrder.course_fee_per_hour * hours;

    if (date) {
        const day = new Date(date).getDay();
        if (day === 0 || day === 6) {
            price *= 1.5;
            addOrderNotification("Занятия в выходные: коэффициент 1.5");
        }
    }

    if (time && time >= "09:00" && time <= "12:00") {
        price += 400;
        addOrderNotification("Утренние занятия (09:00–12:00): +400 ₽");
    }

    if (time && time >= "18:00" && time <= "20:00") {
        price += 1000;
        addOrderNotification("Вечерние занятия (18:00–20:00): +1000 ₽");
    }

    if (selectedCourseForOrder.week_length >= 5) {
        price *= 1.2;
        addOrderNotification("Интенсивный курс (≥ 5 ч/нед): +20%");
    }

    const supplementaryEl = document.getElementById("supplementary");
    if (supplementaryEl && supplementaryEl.checked) {
        price += 2000;
        addOrderNotification("Дополнительные учебные материалы: +2000 ₽");
    }

    const personalizedEl = document.getElementById("personalized");
    if (personalizedEl && personalizedEl.checked) {
        price += 1500 * selectedCourseForOrder.total_length;
        addOrderNotification("Индивидуальные занятия: +1500 ₽ за неделю");
    }

    const excursionsEl = document.getElementById("excursions");
    if (excursionsEl && excursionsEl.checked) {
        price *= 1.25;
        addOrderNotification("Культурные экскурсии: +25%");
    }

    const assessmentEl = document.getElementById("assessment");
    if (assessmentEl && assessmentEl.checked) {
        price += 300;
        addOrderNotification("Предварительная оценка уровня языка: +300 ₽");
    }

    const interactiveEl = document.getElementById("interactive");
    if (interactiveEl && interactiveEl.checked) {
        price *= 1.5;
        addOrderNotification("Интерактивная онлайн-платформа: +50%");
    }

    if (persons >= 5) {
        price *= 0.85;
        addOrderNotification("Групповая скидка (≥ 5 человек): −15%");
    }

    if (date) {
        const start = new Date(date);
        const now = new Date();
        const diffDays = (start - now) / (1000 * 60 * 60 * 24);
        if (diffDays >= 30) {
            price *= 0.9;
            addOrderNotification("Скидка за раннюю регистрацию (≥ 30 дней): −10%");
        }
    }

    const totalEl = document.getElementById("order-total-price");
    if (totalEl) totalEl.textContent = Math.round(price * (persons || 1));
}

function clearOrderNotifications() {
    const box = document.getElementById("order-notifications");
    const list = document.getElementById("order-notification-list");
    if (list) list.innerHTML = "";
    if (box) box.style.display = "none";
}

function addOrderNotification(text) {
    const box = document.getElementById("order-notifications");
    const list = document.getElementById("order-notification-list");
    if (!list || !box) return;
    const li = document.createElement("li");
    li.textContent = text;
    list.appendChild(li);
    box.style.display = "block";
}

document.addEventListener("DOMContentLoaded", () => {
    const courseSearchForm = document.getElementById("course-search-form");
    if (courseSearchForm) {
        courseSearchForm.addEventListener("submit", e => {
            e.preventDefault();
            applyFilters();
        });
    }

    const resetSearchBtn = document.getElementById("reset-search");
    if (resetSearchBtn) resetSearchBtn.addEventListener("click", resetFilters);

    const courseEnrollButton = document.getElementById("courseEnrollButton");
    if (courseEnrollButton) {
        courseEnrollButton.addEventListener("click", () => {
            const courseId = courseEnrollButton.dataset.courseId;
            selectedCourseForOrder = allCourses.find(c => c.id === Number(courseId));
            if (selectedCourseForOrder) openCourseOrderModal(selectedCourseForOrder);
        });
    }

    const orderDateStart = document.getElementById("order-date-start");
    if (orderDateStart) {
        orderDateStart.addEventListener("change", e => {
            const date = e.target.value;
            const timeSelect = document.getElementById("order-time-start");
            if (!selectedCourseForOrder || !timeSelect) {
                calculateCoursePrice();
                return;
            }
            timeSelect.innerHTML = "";
            timeSelect.disabled = false;
            selectedCourseForOrder.start_dates
                .filter(d => d.startsWith(date))
                .forEach(d => {
                    const time = d.split("T")[1].slice(0, 5);
                    timeSelect.innerHTML += `<option value="${time}">${time}</option>`;
                });
            calculateCoursePrice();
        });
    }

    const courseOrderInputs = document.querySelectorAll("#course-order-form input, #course-order-form select");
    if (courseOrderInputs.length) {
        courseOrderInputs.forEach(el => el.addEventListener("change", calculateCoursePrice));
    }

    const submitCourseOrderBtn = document.getElementById("submit-course-order");
    if (submitCourseOrderBtn) {
        submitCourseOrderBtn.addEventListener("click", async () => {
            if (!selectedCourseForOrder) return;
            const modalEl = document.getElementById("courseOrderModal");
            const data = {
                course_id: selectedCourseForOrder.id,
                tutor_id: 0,
                date_start: document.getElementById("order-date-start") ? document.getElementById("order-date-start").value : "",
                time_start: document.getElementById("order-time-start") ? document.getElementById("order-time-start").value : "",
                duration: selectedCourseForOrder.total_length,
                persons: Number(document.getElementById("order-persons") ? document.getElementById("order-persons").value : 1),
                price: Number(document.getElementById("order-total-price") ? document.getElementById("order-total-price").textContent : 0),
                early_registration: false,
                group_enrollment: document.getElementById("order-persons") ? document.getElementById("order-persons").value >= 5 : false,
                intensive_course: selectedCourseForOrder.week_length >= 5,
                supplementary: document.getElementById("supplementary") ? document.getElementById("supplementary").checked : false,
                personalized: document.getElementById("personalized") ? document.getElementById("personalized").checked : false,
                excursions: document.getElementById("excursions") ? document.getElementById("excursions").checked : false,
                assessment: document.getElementById("assessment") ? document.getElementById("assessment").checked : false,
                interactive: document.getElementById("interactive") ? document.getElementById("interactive").checked : false
            };

            try {
                const response = await fetch(`${API_URL}orders?api_key=${API_KEY}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });

                if (!response.ok) throw new Error("Ошибка отправки заявки");

                if (modalEl) bootstrap.Modal.getInstance(modalEl).hide();
                const form = document.getElementById("course-order-form");
                if (form) form.reset();
                clearOrderNotifications();
                selectedCourseForOrder = null;
                alert("Заявка успешно отправлена!");
            } catch (error) {
                alert("Не удалось отправить заявку. Попробуйте позже.");
            }
        });
    }

    const orderPersons = document.getElementById("order-persons");
    if (orderPersons) {
        orderPersons.addEventListener("blur", e => {
            let value = Number(e.target.value);
            if (isNaN(value) || value < 1) value = 1;
            if (value > 20) value = 20;
            e.target.value = value;
            calculateCoursePrice();
        });
    }

    if (document.getElementById("courses-container")) fetchCourses();
});
