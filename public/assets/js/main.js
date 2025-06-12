document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    const resultsDiv = document.getElementById('results');
    const safeSearchCheckbox = document.getElementById('safe-search');
    const sortBySelect = document.getElementById('sort-by');
    const searchHistoryDiv = document.getElementById('search-history');
    
    // List of inappropriate words to filter out (can be expanded)
    const INAPPROPRIATE_WORDS = [
        'fuck', 'shit', 'asshole', 'bitch', 'dick', 'pussy', 'cunt', 
        'nigger', 'fag', 'whore', 'slut', 'cock', 'dickhead', 'bastard',
        'motherfucker', 'fucking', 'shitty', 'ass', 'damn', 'hell'
    ];
    
    // Load search history from localStorage
    let searchHistory = JSON.parse(localStorage.getItem('urbanDictionaryHistory')) || [];
    renderSearchHistory();
    
    // Add focus to input on page load
    searchInput.focus();
    
    searchBtn.addEventListener('click', searchUrbanDictionary);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchUrbanDictionary();
    });
    
    // Add animation to button when input has value
    searchInput.addEventListener('input', () => {
        if (searchInput.value.trim()) {
            searchBtn.classList.add('pulse');
        } else {
            searchBtn.classList.remove('pulse');
        }
    });
    
    async function searchUrbanDictionary() {
        const term = searchInput.value.trim();
        
        if (!term) {
            showError('Please enter a term to search');
            searchInput.focus();
            return;
        }
        
        // Check if search term itself is inappropriate
        if (safeSearchCheckbox.checked && containsInappropriateContent(term)) {
            showError('Please try a different search term');
            return;
        }
        
        showLoading();
        
        try {
            const url = `https://mashape-community-urban-dictionary.p.rapidapi.com/define?term=${encodeURIComponent(term)}`;
            const options = {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': '90e7dd965dmsh1ce0e5781948976p1cd646jsn2298886f802c',
                    'x-rapidapi-host': 'mashape-community-urban-dictionary.p.rapidapi.com'
                }
            };
            
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            // Add to search history
            addToSearchHistory(term);
            
            displayResults(data);
        } catch (error) {
            console.error('Error:', error);
            showError('Failed to fetch definitions. Please try again later.');
        }
    }
    
    function containsInappropriateContent(text) {
        const lowerText = text.toLowerCase();
        return INAPPROPRIATE_WORDS.some(word => lowerText.includes(word));
    }
    
    function filterInappropriateContent(text) {
        // Replace inappropriate words with asterisks
        let filteredText = text;
        INAPPROPRIATE_WORDS.forEach(word => {
            const regex = new RegExp(word, 'gi');
            filteredText = filteredText.replace(regex, '*'.repeat(word.length));
        });
        return filteredText;
    }
    
    function displayResults(data) {
        if (!data.list || data.list.length === 0) {
            showError('No definitions found for this term');
            return;
        }
        
        resultsDiv.innerHTML = '';
        
        // Add content warning
        if (!safeSearchCheckbox.checked) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'warning';
            warningDiv.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Content Notice:</strong> Urban Dictionary contains user-submitted content.
                Some content may be inappropriate or offensive.
            `;
            resultsDiv.appendChild(warningDiv);
        }
        
        // Process and sort results
        let definitions = [...data.list];
        
        // Filter if safe search is on
        if (safeSearchCheckbox.checked) {
            definitions = definitions.filter(item => 
                !containsInappropriateContent(item.word) && 
                !containsInappropriateContent(item.definition) &&
                !containsInappropriateContent(item.example)
            );
        }
        
        if (definitions.length === 0) {
            showError('No appropriate definitions found for this term. Try a different search.');
            return;
        }
        
        // Sort based on selected option
        switch(sortBySelect.value) {
            case 'thumbs_up':
                definitions.sort((a, b) => b.thumbs_up - a.thumbs_up);
                break;
            case 'thumbs_down':
                definitions.sort((a, b) => b.thumbs_down - a.thumbs_down);
                break;
            case 'random':
                definitions = shuffleArray(definitions);
                break;
        }
        
        // Limit to 5 results
        definitions.slice(0, 5).forEach(item => {
            // Clean up definition text
            let cleanDefinition = item.definition
                .replace(/\[/g, '')
                .replace(/\]/g, '')
                .replace(/\r\n/g, '<br>')
                .replace(/\n/g, '<br>');
            
            let cleanExample = item.example
                .replace(/\[/g, '')
                .replace(/\]/g, '')
                .replace(/\r\n/g, '<br>')
                .replace(/\n/g, '<br>');
            
            // Additional filtering if safe search is on
            if (safeSearchCheckbox.checked) {
                cleanDefinition = filterInappropriateContent(cleanDefinition);
                cleanExample = filterInappropriateContent(cleanExample);
            }
            
            const definitionDiv = document.createElement('div');
            definitionDiv.className = 'definition';
            
            const date = new Date(item.written_on).toLocaleDateString();
            
            definitionDiv.innerHTML = `
                <h3>${item.word}</h3>
                <p>${cleanDefinition}</p>
                ${cleanExample ? `<div class="example"><strong>Example:</strong> ${cleanExample}</div>` : ''}
                <div class="thumbs">
                    <span><i class="fas fa-thumbs-up"></i> ${item.thumbs_up.toLocaleString()}</span>
                    <span><i class="fas fa-thumbs-down"></i> ${item.thumbs_down.toLocaleString()}</span>
                </div>
                <div class="author">Submitted by ${item.author} on ${date}</div>
            `;
            resultsDiv.appendChild(definitionDiv);
        });
    }
    
    function addToSearchHistory(term) {
        // Avoid duplicates
        if (!searchHistory.includes(term)) {
            searchHistory.unshift(term);
            // Keep only last 10 searches
            if (searchHistory.length > 10) {
                searchHistory.pop();
            }
            localStorage.setItem('urbanDictionaryHistory', JSON.stringify(searchHistory));
            renderSearchHistory();
        }
    }
    
    function renderSearchHistory() {
        searchHistoryDiv.innerHTML = '';
        searchHistory.forEach(term => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.textContent = term;
            historyItem.addEventListener('click', () => {
                searchInput.value = term;
                searchUrbanDictionary();
            });
            searchHistoryDiv.appendChild(historyItem);
        });
    }
    
    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
    
    function showLoading() {
        resultsDiv.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Searching Urban Dictionary
            </div>
        `;
    }
    
    function showError(message) {
        resultsDiv.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-circle"></i> ${message}
            </div>
        `;
    }
});