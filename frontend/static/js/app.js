document.addEventListener('DOMContentLoaded', function() {
    // Элементы интерфейса
    const loginForm = document.getElementById('loginForm');
    const userInfo = document.getElementById('userInfo');
    const currentUserSpan = document.getElementById('currentUser');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const createProposalBtn = document.getElementById('createProposalBtn');
    const proposalSelect = document.getElementById('proposalSelect');
    const saveLskBtn = document.getElementById('saveLskBtn');
    const inputFields = document.querySelectorAll('input[data-field], select[data-field]');

    let currentToken = null;
    let currentProposalId = null;
    let calculationTimeout;
    let resultsChart = null;

    // Инициализация
        // Инициализация
    checkAuthStatus();
    loadProposals();

    // Назначаем обработчики на все поля ввода
    inputFields.forEach(field => {
        field.addEventListener('input', debounceCalculation);
        field.addEventListener('change', debounceCalculation);
    });

    // Обработчики событий
    loginBtn.addEventListener('click', login);
    logoutBtn.addEventListener('click', logout);
    createProposalBtn.addEventListener('click', createProposal);
    proposalSelect.addEventListener('change', loadProposalDetails);
    saveLskBtn.addEventListener('click', saveLskStructure);

    // Дебаунс для предотвращения частых запросов
    function debounceCalculation() {
        clearTimeout(calculationTimeout);
        calculationTimeout = setTimeout(performCalculation, 500);
    }

    // Основная функция расчета
    async function performCalculation() {
        const data = collectFormData();

        try {
            const response = await fetch('/calculate/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const responseData = await response.json();

            if (!response.ok) {
                console.error('Calculation error:', responseData);
                throw new Error(responseData.detail || 'Ошибка расчета');
            }

            displayResults(responseData.results);
            updateChart(responseData.results);
        } catch (error) {
            console.error('Calculation error:', error);
            showError('Ошибка расчета: ' + error.message);
        }
    }

    // Показать ошибку
    function showError(message) {
        const errorDiv = document.getElementById('calculationError');
        if (!errorDiv) {
            const container = document.querySelector('.app-container');
            const div = document.createElement('div');
            div.id = 'calculationError';
            div.className = 'error-message';
            div.textContent = message;
            container.prepend(div);
        } else {
            errorDiv.textContent = message;
        }
    }

    // Функции авторизации
    async function checkAuthStatus() {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const response = await fetch('/users/me/', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const user = await response.json();
                    currentToken = token;
                    showUserInfo(user.username);
                } else {
                    localStorage.removeItem('token');
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('token');
            }
        }
    }

    async function login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);
            formData.append('grant_type', 'password');

            const response = await fetch('/token', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                currentToken = data.access_token;
                localStorage.setItem('token', currentToken);
                showUserInfo(username);
                loadProposals();
            } else {
                alert('Ошибка авторизации. Проверьте логин и пароль.');
            }
        } catch (error) {
            console.error('Login failed:', error);
            alert('Ошибка соединения с сервером.');
        }
    }

    function logout() {
        currentToken = null;
        localStorage.removeItem('token');
        hideUserInfo();
        clearProposals();
    }

    function showUserInfo(username) {
        currentUserSpan.textContent = username;
        loginForm.style.display = 'none';
        userInfo.style.display = 'flex';
    }

    function hideUserInfo() {
        loginForm.style.display = 'flex';
        userInfo.style.display = 'none';
    }

    // Работа с коммерческими предложениями
    async function loadProposals() {
        if (!currentToken) return;

        try {
            const response = await fetch('/proposals/', {
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            });

            if (response.ok) {
                const proposals = await response.json();
                updateProposalSelect(proposals);
            }
        } catch (error) {
            console.error('Failed to load proposals:', error);
        }
    }

    function updateProposalSelect(proposals) {
        proposalSelect.innerHTML = '<option value="">-- Выберите КП --</option>';

        proposals.forEach(proposal => {
            const option = document.createElement('option');
            option.value = proposal.id;
            option.textContent = proposal.title;
            proposalSelect.appendChild(option);
        });
    }

    function clearProposals() {
        proposalSelect.innerHTML = '<option value="">-- Выберите КП --</option>';
        document.getElementById('proposalDetails').innerHTML = '';
        document.getElementById('proposalLskList').innerHTML = '';
    }

    async function createProposal() {
        if (!currentToken) {
            alert('Для создания КП необходимо авторизоваться');
            return;
        }

        const title = document.getElementById('proposalTitle').value;
        const description = document.getElementById('proposalDescription').value;

        if (!title) {
            alert('Введите название КП');
            return;
        }

        try {
            const response = await fetch('/proposals/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title,
                    description: description
                })
            });

            if (response.ok) {
                alert('КП успешно создано');
                document.getElementById('proposalTitle').value = '';
                document.getElementById('proposalDescription').value = '';
                loadProposals();
            } else {
                alert('Ошибка при создании КП');
            }
        } catch (error) {
            console.error('Failed to create proposal:', error);
            alert('Ошибка соединения с сервером');
        }
    }

    async function loadProposalDetails() {
        currentProposalId = this.value;
        if (!currentProposalId) {
            document.getElementById('proposalDetails').innerHTML = '';
            document.getElementById('proposalLskList').innerHTML = '';
            return;
        }

        try {
            // Загружаем детали КП
            const proposalResponse = await fetch(`/proposals/${currentProposalId}`, {
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            });

            // Загружаем список конструкций КП
            const lskResponse = await fetch(`/lsk/${currentProposalId}`, {
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            });

            if (proposalResponse.ok && lskResponse.ok) {
                const proposal = await proposalResponse.json();
                const lskStructures = await lskResponse.json();

                // Отображаем детали КП
                const proposalDetails = document.getElementById('proposalDetails');
                proposalDetails.innerHTML = `
                    <p><strong>Название:</strong> ${proposal.title}</p>
                    <p><strong>Описание:</strong> ${proposal.description || 'нет'}</p>
                    <p><strong>Дата создания:</strong> ${new Date(proposal.created_at).toLocaleString()}</p>
                `;

                // Отображаем список конструкций
                const lskList = document.getElementById('proposalLskList');
                if (lskStructures.length > 0) {
                    lskList.innerHTML = '<h4>Конструкции в этом КП:</h4>';
                    const list = document.createElement('ul');
                    lskStructures.forEach(lsk => {
                        const item = document.createElement('li');
                        item.textContent = `${lsk.name} (${lsk.long_side_usefull} x ${lsk.short_side_usefull} мм)`;
                        list.appendChild(item);
                    });
                    lskList.appendChild(list);
                } else {
                    lskList.innerHTML = '<p>В этом КП пока нет конструкций</p>';
                }
            }
        } catch (error) {
            console.error('Failed to load proposal details:', error);
        }
    }

    // Сбор данных формы
    function collectFormData() {
        const data = {};

        inputFields.forEach(field => {
            if (field.dataset.field && field.value.trim() !== '') {
                data[field.dataset.field] = isNaN(field.value) ? field.value : Number(field.value);
            }
        });

        return data;
    }

    // Сохранение конструкции
    async function saveLskStructure() {
        if (!currentToken) {
            alert('Для сохранения конструкции необходимо авторизоваться');
            return;
        }

        if (!currentProposalId) {
            alert('Выберите коммерческое предложение');
            return;
        }

        const lskName = document.getElementById('lsk_name').value;
        if (!lskName) {
            alert('Введите название конструкции');
            return;
        }

        // Сначала выполняем расчет
        const calculationData = collectFormData();
        try {
            const calcResponse = await fetch('/calculate/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify(calculationData)
            });

            if (!calcResponse.ok) {
                const errorData = await calcResponse.json();
                throw new Error(errorData.detail || 'Ошибка расчета');
            }

            const calcResults = await calcResponse.json();

            // Теперь сохраняем конструкцию с результатами расчета
            const saveData = {
                ...calculationData,
                ...calcResults.results,
                proposal_id: currentProposalId,
                name: lskName
            };

            const saveResponse = await fetch('/lsk/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(saveData)
            });

            if (saveResponse.ok) {
                alert('Конструкция успешно сохранена');
                loadProposalDetails(); // Обновляем список конструкций
            } else {
                const errorData = await saveResponse.json();
                alert(`Ошибка при сохранении: ${errorData.detail || 'Неизвестная ошибка'}`);
            }
        } catch (error) {
            console.error('Failed to save LSK:', error);
            alert(`Ошибка: ${error.message}`);
        }
    }

    // Отображение результатов
    function displayResults(results) {
        // Геометрические параметры
        setResultValue('long_side_usefull', results.long_side_usefull, 'mm');
        setResultValue('short_side_usefull', results.short_side_usefull, 'mm');
        setResultValue('long_window', results.long_window, 'mm');
        setResultValue('short_window', results.short_window, 'mm');
        setResultValue('len_between_nodes', results.len_between_nodes, 'mm');

        // Площади
        setResultValue('s_hole', results.s_hole, 'm²', 4);
        setResultValue('s_window', results.s_window, 'm²', 4);
        setResultValue('s_usefull', results.s_usefull, 'm²', 4);
        setResultValue('s_effictive_1', results.s_effictive_1, 'm²', 6);
        setResultValue('s_effictive_wind_max', results.s_effictive_wind_max, 'm²', 6);

        // Ветровые параметры
        setResultValue('w_0', results.w_0, '', 4);
        setResultValue('k_koef', results.k_koef, '', 4);
        setResultValue('ripple_ratio', results.ripple_ratio, '', 4);
        setResultValue('correlation_coff', results.correlation_coff, '', 4);
        setResultValue('wind_peak_load', results.wind_peak_load, 'Pa', 4);

        // Критические параметры
        setCriticalResult('p_min', results.p_min, 'Pa', 2, 0, 100);
        setCriticalResult('p_max', results.p_max, 'Pa', 2, 65, 100);
        setCriticalResult('angle_a', results.angle_a, '°', 2, 0, 35);

        setResultValue('sling_len_work', results.sling_len_work, 'mm', 2);

        // Предупреждения
        setStatusMessage('warning', results.warning, results.p_max, 65, 100);
        setStatusMessage('warning_2', results.warning_2, results.p_max - results.p_min, 25);
        setStatusMessage('warning_angle_value', results.warning_angle_value, results.angle_a, 25, 35);
    }

    function setResultValue(elementId, value, unit = '', precision = 2) {
        const element = document.getElementById(elementId);
        if (element && value !== undefined) {
            element.textContent = value.toFixed(precision) + (unit ? ' ' + unit : '');
        }
    }

    function setCriticalResult(elementId, value, unit = '', precision = 2, min = 0, max = 100) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const container = element.closest('.result-item');
        if (!container) return;

        element.textContent = value.toFixed(precision) + (unit ? ' ' + unit : '');

        // Очищаем предыдущие классы статуса
        container.classList.remove('status-good', 'status-warning', 'status-danger');

        // Определяем статус значения
        if (value < min || value > max) {
            container.classList.add('status-danger');
        } else if (value > max * 0.8 || value < min * 1.2) {
            container.classList.add('status-warning');
        } else {
            container.classList.add('status-good');
        }
    }

    function setStatusMessage(elementId, text, value, warningThreshold = 25, dangerThreshold = 35) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const container = element.closest('.result-item');
        if (!container) return;

        element.textContent = text;

        // Очищаем предыдущие классы статуса
        container.classList.remove('status-good', 'status-warning', 'status-danger', 'status-info');

        // Определяем статус сообщения
        if (text.includes('допустимо') || (value < warningThreshold && value > 0)) {
            container.classList.add('status-good');
        } else if (text.includes('Разница') || (value >= warningThreshold && value < dangerThreshold)) {
            container.classList.add('status-warning');
        } else {
            container.classList.add('status-danger');
        }
    }

    function updateChart(results) {
        const ctx = document.getElementById('resultsChart').getContext('2d');

        if (resultsChart) {
            resultsChart.destroy();
        }

        resultsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Pmin (Па)', 'Pmax (Па)', 'Угол α (°)'],
                datasets: [{
                    label: 'Критические параметры',
                    data: [results.p_min, results.p_max, results.angle_a],
                    backgroundColor: [
                        getBarColor(results.p_min, 0, 100),
                        getBarColor(results.p_max, 65, 100),
                        getBarColor(results.angle_a, 0, 35)
                    ],
                    borderColor: [
                        getBarColor(results.p_min, 0, 100, 0.8),
                        getBarColor(results.p_max, 65, 100, 0.8),
                        getBarColor(results.angle_a, 0, 35, 0.8)
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Значения',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'График критических параметров',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            bottom: 20
                        }
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += context.raw;
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    function getBarColor(value, min, max, opacity = 0.7) {
        if (value < min || value > max) {
            return `rgba(247, 37, 133, ${opacity})`; // Красный
        } else if (value > max * 0.8 || value < min * 1.2) {
            return `rgba(248, 150, 30, ${opacity})`; // Оранжевый
        } else {
            return `rgba(76, 201, 240, ${opacity})`; // Голубой
        }
    }

    // Первоначальный расчет при загрузке
    performCalculation();
});