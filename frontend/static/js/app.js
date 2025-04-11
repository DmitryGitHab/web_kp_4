document.addEventListener('DOMContentLoaded', function() {
    const inputFields = document.querySelectorAll('input, select');
    let calculationTimeout;
    let resultsChart = null;

    // Назначаем обработчики на все поля ввода
    inputFields.forEach(field => {
        field.addEventListener('input', debounceCalculation);
        field.addEventListener('change', debounceCalculation);
    });

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
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const responseData = await response.json();

            if (!response.ok) {
                console.error('Validation errors:', responseData.errors);
                showValidationErrors(responseData.errors);
                throw new Error(responseData.detail || 'Ошибка расчета');
            }

            displayResults(responseData.results);
            updateChart(responseData.results);
        } catch (error) {
            console.error('Calculation error:', error);
        }
    }

    // Сбор данных формы
    function collectFormData() {
        const data = {};

        inputFields.forEach(field => {
            if (field.name && field.value.trim() !== '') {
                data[field.name] = isNaN(field.value) ? field.value : Number(field.value);
            }
        });

        return data;
    }

    // Отображение ошибок валидации
    function showValidationErrors(errors) {
        // Сначала скрываем все предыдущие ошибки
        document.querySelectorAll('.error-message').forEach(el => el.remove());
        document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));

        // Показываем новые ошибки
        errors.forEach(error => {
            const field = document.querySelector(`[name="${error.field}"]`);
            if (field) {
                const formGroup = field.closest('.form-group');
                if (formGroup) {
                    formGroup.classList.add('has-error');
                    const errorElement = document.createElement('div');
                    errorElement.className = 'error-message';
                    errorElement.textContent = error.message;
                    formGroup.appendChild(errorElement);
                }
            }
        });
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