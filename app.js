document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const moviesContainer = document.getElementById('movies-container');
  const loadingSpinner = document.getElementById('loading-spinner');
  const emptyState = document.getElementById('empty-state');
  const resultsCount = document.getElementById('results-count');
  
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search');
  const decadeFilters = document.getElementById('decade-filters');
  const sortSelect = document.getElementById('sort-select');
  
  const gridViewBtn = document.getElementById('grid-view-btn');
  const listViewBtn = document.getElementById('list-view-btn');
  const resetFiltersBtn = document.getElementById('reset-filters-btn');
  const paginationContainer = document.getElementById('pagination-container');
  
  // Modal Elements
  const movieModal = document.getElementById('movie-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalBlurBg = document.getElementById('modal-blur-bg');
  const modalPoster = document.getElementById('modal-poster');
  const modalRank = document.getElementById('modal-rank');
  const modalScore = document.getElementById('modal-score');
  const modalTitle = document.getElementById('modal-title');
  const modalStar = document.getElementById('modal-star');
  const modalRelease = document.getElementById('modal-release');

  // App State
  let movies = [];
  let filteredMovies = [];
  let searchQuery = '';
  let activeDecade = 'all'; // 'all', '1990', '2000', '2010', '2020'
  let currentSort = 'rank-asc';
  let currentView = 'grid'; // 'grid', 'list'
  let currentPage = 1;
  const itemsPerPage = 10;

  // Initialize
  function init() {
    showLoading(true);
    
    // Load from the globally assigned variable from movies.js / movies_backup.js
    movies = window.moviesData || [];
    
    if (movies.length === 0) {
      console.error('Failed to load movie database.');
      showErrorState();
      return;
    }
    
    showLoading(false);
    applyFiltersAndRender();
    setupEventListeners();
  }

  // Helper: Extract year from release time string
  function extractYear(releaseTimeStr) {
    if (!releaseTimeStr) return 0;
    const match = releaseTimeStr.match(/\d{4}/);
    return match ? parseInt(match[0]) : 0;
  }

  // Helper: Get proxied image URL to bypass hotlinking and network blocks
  function getProxyImageUrl(url) {
    if (!url) return '';
    // If it's a remote URL starting with http, proxy it via wsrv.nl
    if (url.startsWith('http')) {
      return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=220&h=300&fit=cover`;
    }
    return url; // Local path
  }

  // Helper: Get larger proxied image URL for modal
  function getProxyImageUrlForModal(url) {
    if (!url) return '';
    if (url.startsWith('http')) {
      return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=400&h=550&fit=cover`;
    }
    return url;
  }

  // Filter & Sort Logic
  function applyFiltersAndRender() {
    // 1. Apply Search Filter
    filteredMovies = movies.filter(movie => {
      const titleMatch = movie.title.toLowerCase().includes(searchQuery.toLowerCase());
      const starMatch = movie.star.toLowerCase().includes(searchQuery.toLowerCase());
      return titleMatch || starMatch;
    });

    // 2. Apply Decade Filter
    if (activeDecade !== 'all') {
      filteredMovies = filteredMovies.filter(movie => {
        const year = extractYear(movie.releasetime);
        if (activeDecade === '1990') {
          return year < 2000;
        } else if (activeDecade === '2000') {
          return year >= 2000 && year < 2010;
        } else if (activeDecade === '2010') {
          return year >= 2010 && year < 2020;
        } else if (activeDecade === '2020') {
          return year >= 2020;
        }
        return true;
      });
    }

    // 3. Apply Sorting
    filteredMovies.sort((a, b) => {
      const scoreA = parseFloat(a.score) || 0;
      const scoreB = parseFloat(b.score) || 0;
      const yearA = extractYear(a.releasetime);
      const yearB = extractYear(b.releasetime);

      if (currentSort === 'rank-asc') {
        return a.rank - b.rank;
      } else if (currentSort === 'rank-desc') {
        return b.rank - a.rank;
      } else if (currentSort === 'score-desc') {
        // Tie-breaker: sort by rank if scores are identical
        if (scoreB === scoreA) return a.rank - b.rank;
        return scoreB - scoreA;
      } else if (currentSort === 'date-desc') {
        if (yearB === yearA) return a.rank - b.rank;
        return yearB - yearA;
      } else if (currentSort === 'date-asc') {
        if (yearA === yearB) return a.rank - b.rank;
        return yearA - yearB;
      }
      return 0;
    });

    renderPagination();
    renderMovies();
  }

  // Render Function
  function renderMovies() {
    resultsCount.textContent = filteredMovies.length;
    moviesContainer.className = currentView === 'grid' ? 'movies-grid' : 'movies-list';

    if (filteredMovies.length === 0) {
      moviesContainer.style.display = 'none';
      emptyState.style.display = 'flex';
      paginationContainer.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    moviesContainer.style.display = currentView === 'grid' ? 'grid' : 'flex';
    paginationContainer.style.display = 'flex';

    // Pagination Slicing
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredMovies.length);
    const paginatedMovies = filteredMovies.slice(startIndex, endIndex);

    moviesContainer.innerHTML = paginatedMovies.map(movie => {
      if (currentView === 'grid') {
        return `
          <div class="movie-card" data-rank="${movie.rank}" onclick="openModal(${movie.rank})">
            <span class="rank-badge">#${movie.rank}</span>
            <div class="card-img">
              <img src="${getProxyImageUrl(movie.img_url)}" alt="${movie.title}" loading="lazy" onerror="this.onerror=null; this.src=&quot;data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='220' viewBox='0 0 160 220'><rect width='100%25' height='100%25' fill='%231e293b'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='14'>🎬 無海報</text></svg>&quot;;">
            </div>
            <div class="card-info">
              <div class="card-rating">
                <span class="star">★</span> ${movie.score || '無'}
              </div>
              <h3 class="card-title" title="${movie.title}">${movie.title}</h3>
              <div class="card-meta">
                <span class="card-star" title="${movie.star}">主演: ${movie.star}</span>
                <span class="card-time">上映: ${movie.releasetime}</span>
              </div>
            </div>
          </div>
        `;
      } else {
        // List View Row
        return `
          <div class="movie-card" data-rank="${movie.rank}" onclick="openModal(${movie.rank})">
            <span class="rank-badge">#${movie.rank}</span>
            <div class="card-img">
              <img src="${getProxyImageUrl(movie.img_url)}" alt="${movie.title}" loading="lazy" onerror="this.onerror=null; this.src=&quot;data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='220' viewBox='0 0 160 220'><rect width='100%25' height='100%25' fill='%231e293b'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='14'>🎬 無海報</text></svg>&quot;;">
            </div>
            <div class="card-info">
              <div class="card-text-group">
                <h3 class="card-title">${movie.title}</h3>
                <div class="card-meta">
                  <span>主演: ${movie.star}</span>
                  <span>上映日期: ${movie.releasetime}</span>
                </div>
              </div>
              <div class="card-rating">
                <span class="star">★</span> ${movie.score || '無'}
              </div>
            </div>
          </div>
        `;
      }
    }).join('');
  }

  // Render Pagination Controls
  function renderPagination() {
    const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
    
    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      paginationContainer.style.display = 'none';
      return;
    }
    
    paginationContainer.style.display = 'flex';
    let html = '';
    
    // Prev Button
    html += `
      <button class="page-btn nav-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})" aria-label="上一頁">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="nav-arrow">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
    `;
    
    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
      html += `
        <button class="page-btn num-btn ${currentPage === i ? 'active' : ''}" onclick="changePage(${i})">
          ${i}
        </button>
      `;
    }
    
    // Next Button
    html += `
      <button class="page-btn nav-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})" aria-label="下一頁">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="nav-arrow">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    `;
    
    paginationContainer.innerHTML = html;
  }

  // Change Page Global Function
  window.changePage = function(page) {
    const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderPagination();
    renderMovies();
    // Scroll back to the top of movies section smoothly
    const moviesSection = document.querySelector('.movies-section');
    if (moviesSection) {
      window.scrollTo({
        top: moviesSection.offsetTop - 30,
        behavior: 'smooth'
      });
    }
  };

  // Modal Open
  window.openModal = function(rank) {
    const movie = movies.find(m => m.rank === rank);
    if (!movie) return;

    // Set Modal Data
    modalBlurBg.style.backgroundImage = `url('${getProxyImageUrlForModal(movie.img_url)}')`;
    modalPoster.src = getProxyImageUrlForModal(movie.img_url);
    modalPoster.alt = movie.title;
    modalRank.textContent = `#${movie.rank}`;
    modalScore.textContent = movie.score || '無';
    modalTitle.textContent = movie.title;
    modalStar.textContent = movie.star;
    modalRelease.textContent = movie.releasetime;

    // Show modal
    movieModal.classList.add('active');
    movieModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Lock scrolling
  };

  // Modal Close
  function closeModal() {
    movieModal.classList.remove('active');
    movieModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; // Restore scrolling
  }

  // Setup UI State Helpers
  function showLoading(isLoading) {
    loadingSpinner.style.display = isLoading ? 'flex' : 'none';
    moviesContainer.style.display = isLoading ? 'none' : 'grid';
  }

  function showErrorState() {
    showLoading(false);
    moviesContainer.style.display = 'none';
    emptyState.style.display = 'flex';
    emptyState.querySelector('h3').textContent = '資料載入出錯';
    emptyState.querySelector('p').textContent = '無法取得電影排行資料，請檢查伺服器或稍後再試。';
    resetFiltersBtn.style.display = 'none';
  }

  // Event Listeners Configuration
  function setupEventListeners() {
    // Search input handler
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
      currentPage = 1;
      applyFiltersAndRender();
    });

    // Clear search handler
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      searchInput.focus();
      currentPage = 1;
      applyFiltersAndRender();
    });

    // Decade filter handler
    decadeFilters.addEventListener('click', (e) => {
      const button = e.target.closest('.filter-btn');
      if (!button) return;

      // Toggle active status
      decadeFilters.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      activeDecade = button.dataset.decade;
      currentPage = 1;
      applyFiltersAndRender();
    });

    // Sorting selection handler
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      currentPage = 1;
      applyFiltersAndRender();
    });

    // View toggle handler - Grid
    gridViewBtn.addEventListener('click', () => {
      if (currentView === 'grid') return;
      currentView = 'grid';
      gridViewBtn.classList.add('active');
      listViewBtn.classList.remove('active');
      renderMovies();
    });

    // View toggle handler - List
    listViewBtn.addEventListener('click', () => {
      if (currentView === 'list') return;
      currentView = 'list';
      listViewBtn.classList.add('active');
      gridViewBtn.classList.remove('active');
      renderMovies();
    });

    // Reset Filters button handler
    resetFiltersBtn.addEventListener('click', () => {
      resetAllFilters();
    });

    // Modal Close button
    modalCloseBtn.addEventListener('click', closeModal);

    // Modal overlay click (close modal when clicking outside wrapper)
    movieModal.addEventListener('click', (e) => {
      if (e.target === movieModal) {
        closeModal();
      }
    });

    // Keyboard handlers (Escape closes modal)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && movieModal.classList.contains('active')) {
        closeModal();
      }
    });
  }

  // Reset filter values
  function resetAllFilters() {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    
    decadeFilters.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    decadeFilters.querySelector('[data-decade="all"]').classList.add('active');
    activeDecade = 'all';
    
    sortSelect.value = 'rank-asc';
    currentSort = 'rank-asc';
    currentPage = 1;
    
    applyFiltersAndRender();
  }

  // Fire up the application
  init();
});
