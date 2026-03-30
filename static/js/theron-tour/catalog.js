(function () {
    function pickFirst() {
        for (var i = 0; i < arguments.length; i += 1) {
            var value = arguments[i];
            if (value !== null && value !== undefined && value !== '') {
                return value;
            }
        }
        return null;
    }

    function normalizeTrip(rawTrip) {
        var trip = rawTrip || {};
        var images = Array.isArray(trip.images) ? trip.images : [];
        var image = pickFirst(
            trip.coverImageUrl,
            trip.cover_image_url,
            images[0] && (typeof images[0] === 'string' ? images[0] : pickFirst(images[0].url, images[0].imageUrl))
        );

        return {
            id: pickFirst(trip.id, trip.tripId),
            slug: pickFirst(trip.slug, trip.code),
            title: pickFirst(trip.title, trip.name, 'Viagem sem titulo'),
            destination: pickFirst(trip.destination, trip.city, 'Destino'),
            summary: pickFirst(trip.shortDescription, trip.short_description, trip.summary, ''),
            description: pickFirst(trip.fullDescription, trip.full_description, trip.description, trip.summary, ''),
            price: Number(pickFirst(trip.price, trip.basePrice, trip.base_price, 0) || 0),
            image: image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80'
        };
    }

    function normalizeListPayload(response) {
        var payload = response && response.data !== undefined ? response.data : response;

        if (Array.isArray(payload)) {
            return { items: payload, totalPages: 1, currentPage: 0 };
        }

        if (payload && Array.isArray(payload.content)) {
            return {
                items: payload.content,
                totalPages: Number(payload.totalPages || 1),
                currentPage: Number(payload.number || 0)
            };
        }

        if (payload && Array.isArray(payload.items)) {
            return {
                items: payload.items,
                totalPages: Number(payload.totalPages || 1),
                currentPage: Number(payload.page || 0)
            };
        }

        return { items: [], totalPages: 1, currentPage: 0 };
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
    }

    function mountCard(trip) {
        var card = document.createElement('article');
        card.className = 'tt-trip-card';
        card.innerHTML = [
            '<img src="' + trip.image + '" alt="Imagem de ' + trip.title + '">',
            '<div class="tt-trip-card-content">',
            '<p class="tt-destination inter">' + trip.destination + '</p>',
            '<h3 class="montserrat">' + trip.title + '</h3>',
            '<p class="inter">' + (trip.summary || 'Sem resumo disponivel.') + '</p>',
            '<div class="tt-trip-card-footer">',
            '<strong class="montserrat">' + formatCurrency(trip.price) + '</strong>',
            '<a class="btn btn-primary" href="/theron-tour/destinos/' + trip.slug + '">Ver detalhes</a>',
            '</div>',
            '</div>'
        ].join('');
        return card;
    }

    function bindListPage() {
        var grid = document.querySelector('#tt-catalog-grid');
        if (!grid) {
            return;
        }

        var form = document.querySelector('#tt-trip-filters');
        var searchInput = document.querySelector('#tt-search');
        var destinationInput = document.querySelector('#tt-destination');
        var clearButton = document.querySelector('#tt-clear');
        var feedback = document.querySelector('#tt-catalog-feedback');
        var prevButton = document.querySelector('#tt-prev');
        var nextButton = document.querySelector('#tt-next');
        var pageLabel = document.querySelector('#tt-page-label');

        var state = {
            page: 1,
            totalPages: 1,
            search: '',
            destination: ''
        };

        function renderFeedback(message) {
            feedback.textContent = message;
            feedback.classList.remove('hidden');
        }

        function hideFeedback() {
            feedback.classList.add('hidden');
        }

        function updatePagination() {
            pageLabel.textContent = 'Pagina ' + state.page;
            prevButton.disabled = state.page <= 1;
            nextButton.disabled = state.page >= state.totalPages;
        }

        function loadTrips() {
            renderFeedback('Carregando viagens...');
            grid.innerHTML = '';

            var params = new URLSearchParams({
                page: Math.max(state.page - 1, 0),
                size: 9,
                search: state.search,
                destination: state.destination
            });

            fetch('/api/public/trips?' + params.toString())
                .then(function (response) { return response.json(); })
                .then(function (json) {
                    var normalized = normalizeListPayload(json);
                    var trips = normalized.items.map(normalizeTrip);

                    state.totalPages = Math.max(Number(normalized.totalPages || 1), 1);
                    state.page = Number(normalized.currentPage || 0) + 1;
                    updatePagination();

                    if (!trips.length) {
                        renderFeedback('Nenhum destino encontrado para os filtros informados.');
                        return;
                    }

                    hideFeedback();
                    trips.forEach(function (trip) {
                        grid.appendChild(mountCard(trip));
                    });
                })
                .catch(function () {
                    renderFeedback('Nao foi possivel carregar o catalogo de viagens.');
                });
        }

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            state.page = 1;
            state.search = (searchInput.value || '').trim();
            state.destination = (destinationInput.value || '').trim();
            loadTrips();
        });

        clearButton.addEventListener('click', function () {
            searchInput.value = '';
            destinationInput.value = '';
            state.page = 1;
            state.search = '';
            state.destination = '';
            loadTrips();
        });

        prevButton.addEventListener('click', function () {
            if (state.page > 1) {
                state.page -= 1;
                loadTrips();
            }
        });

        nextButton.addEventListener('click', function () {
            if (state.page < state.totalPages) {
                state.page += 1;
                loadTrips();
            }
        });

        updatePagination();
        loadTrips();
    }

    function bindDetailPage() {
        var section = document.querySelector('.tt-detail-page');
        if (!section) {
            return;
        }

        var slug = section.getAttribute('data-trip-slug');
        var feedback = document.querySelector('#tt-detail-feedback');
        var card = document.querySelector('#tt-detail-card');

        fetch('/api/public/trips/' + encodeURIComponent(slug))
            .then(function (response) { return response.json(); })
            .then(function (json) {
                var payload = json && json.data !== undefined ? json.data : json;
                var trip = normalizeTrip(payload || {});

                document.querySelector('#tt-detail-image').src = trip.image;
                document.querySelector('#tt-detail-image').alt = 'Imagem de ' + trip.title;
                document.querySelector('#tt-detail-destination').textContent = trip.destination;
                document.querySelector('#tt-detail-title').textContent = trip.title;
                document.querySelector('#tt-detail-summary').textContent = trip.summary || 'Sem resumo disponivel.';
                document.querySelector('#tt-detail-description').textContent = trip.description || 'Detalhes em breve.';
                document.querySelector('#tt-detail-price').textContent = formatCurrency(trip.price);
                var buyNowLink = document.querySelector('#tt-buy-now');
                if (buyNowLink) {
                    buyNowLink.href = '/theron-tour/checkout/' + encodeURIComponent(trip.slug || slug);
                }

                feedback.classList.add('hidden');
                card.classList.remove('hidden');
            })
            .catch(function () {
                feedback.textContent = 'Nao foi possivel carregar os detalhes desta viagem.';
                feedback.classList.remove('hidden');
                card.classList.add('hidden');
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            bindListPage();
            bindDetailPage();
        });
    } else {
        bindListPage();
        bindDetailPage();
    }
})();
