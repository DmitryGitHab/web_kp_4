document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Загрузка списка КП
    await loadProposals();

    // Обработчики событий
    document.getElementById('newProposalBtn').addEventListener('click', openModal);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('proposalForm').addEventListener('submit', createProposal);
    document.querySelector('.close').addEventListener('click', closeModal);

    // Клик по модальному окну
    document.getElementById('proposalModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
});

async function loadProposals() {
    try {
        const response = await fetch('/proposals', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Ошибка загрузки КП');
        }

        const proposals = await response.json();
        renderProposals(proposals);
    } catch (error) {
        alert(error.message);
    }
}

function renderProposals(proposals) {
    const container = document.getElementById('proposalsList');
    container.innerHTML = '';

    if (proposals.length === 0) {
        container.innerHTML = '<p>Нет коммерческих предложений</p>';
        return;
    }

    proposals.forEach(proposal => {
        const proposalElement = document.createElement('div');
        proposalElement.className = 'proposal-card';
        proposalElement.innerHTML = `
            <h3>${proposal.title}</h3>
            <p>${proposal.description || 'Без описания'}</p>
            <div class="proposal-meta">
                <span>Создано: ${new Date(proposal.created_at).toLocaleDateString()}</span>
                <button class="view-proposal" data-id="${proposal.id}">Открыть</button>
            </div>
        `;
        container.appendChild(proposalElement);
    });

    // Добавляем обработчики для кнопок "Открыть"
    document.querySelectorAll('.view-proposal').forEach(btn => {
        btn.addEventListener('click', function() {
            window.location.href = `/proposal/${this.getAttribute('data-id')}`;
        });
    });
}

function openModal() {
    document.getElementById('proposalModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('proposalModal').style.display = 'none';
}

async function createProposal(e) {
    e.preventDefault();

    const title = document.getElementById('proposalTitle').value;
    const description = document.getElementById('proposalDescription').value;

    try {
        const response = await fetch('/proposals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
                title: title,
                description: description
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка создания КП');
        }

        closeModal();
        await loadProposals();
    } catch (error) {
        alert(error.message);
    }
}

function logout() {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
}