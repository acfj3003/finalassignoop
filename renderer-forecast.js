// API Configuration
const API_KEY = '32804b24a847407391c53709241010';
const BASE_URL = 'https://api.weatherapi.com/v1';

let activities = [];

document.addEventListener('DOMContentLoaded', () => {
    loadActivities();
    
    document.getElementById('getForecastBtn').addEventListener('click', getForecast);
    document.getElementById('forecastLocation').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            getForecast();
        }
    });
    
    getForecast();
});

function loadActivities() {
    const saved = localStorage.getItem('weatherActivities');
    if (saved) {
        activities = JSON.parse(saved);
    }
}

async function getForecast() {
    const location = document.getElementById('forecastLocation').value;
    const spinner = document.getElementById('loadingSpinner');
    
    if (spinner) spinner.style.display = 'block';

    try {
        const response = await fetch(`${BASE_URL}/forecast.json?key=${API_KEY}&q=${location}&days=3&aqi=no&alerts=no`);
        
        if (!response.ok) {
            throw new Error('Location not found');
        }

        const data = await response.json();
        displayForecast(data);
        calculateStats(data);
        suggestActivities(data);
        
        document.getElementById('forecastSection').style.display = 'block';
        
    } catch (error) {
        alert('Error fetching forecast: ' + error.message);
        document.getElementById('forecastCards').innerHTML = `
            <div class="error-message">
                <p>Error: ${error.message}</p>
                <p>Please try another location.</p>
            </div>
        `;
    } finally {
        if (spinner) spinner.style.display = 'none';
    }
}

function displayForecast(data) {
    const forecastCards = document.getElementById('forecastCards');
    const forecast = data.forecast.forecastday;

    forecastCards.innerHTML = forecast.map((day, index) => {
        const date = new Date(day.date);
        const dayName = index === 0 ? 'Today' : 
                       index === 1 ? 'Tomorrow' : 
                       date.toLocaleDateString('en-US', { weekday: 'long' });

        return `
            <div class="forecast-card">
                <h3>${dayName} (${new Date(day.date).toLocaleDateString()})</h3>
                <div class="weather-icon">
                    <img src="https:${day.day.condition.icon}" alt="${day.day.condition.text}">
                </div>
                <div class="forecast-detail">
                    <span class="forecast-label">Temperature:</span>
                    <span class="forecast-value">${day.day.avgtemp_c}°C</span>
                </div>
                <div class="forecast-detail">
                    <span class="forecast-label">Min/Max:</span>
                    <span class="forecast-value">${day.day.mintemp_c}°C - ${day.day.maxtemp_c}°C</span>
                </div>
                <div class="forecast-detail">
                    <span class="forecast-label">Condition:</span>
                    <span class="forecast-value">${day.day.condition.text}</span>
                </div>
                <div class="forecast-detail">
                    <span class="forecast-label">Rain Chance:</span>
                    <span class="forecast-value">${day.day.daily_chance_of_rain}%</span>
                </div>
                <div class="forecast-detail">
                    <span class="forecast-label">Humidity:</span>
                    <span class="forecast-value">${day.day.avghumidity}%</span>
                </div>
                <div class="forecast-detail">
                    <span class="forecast-label">Wind:</span>
                    <span class="forecast-value">${day.day.maxwind_kph} km/h</span>
                </div>
            </div>
        `;
    }).join('');
}

function calculateStats(data) {
    const forecast = data.forecast.forecastday;
    
    const avgTemp = (forecast.reduce((sum, day) => sum + day.day.avgtemp_c, 0) / forecast.length).toFixed(1);
    document.getElementById('avgTempForecast').textContent = `${avgTemp}°C`;
    
    const avgRainProb = (forecast.reduce((sum, day) => sum + day.day.daily_chance_of_rain, 0) / forecast.length).toFixed(0);
    document.getElementById('rainProbability').textContent = `${avgRainProb}%`;
    
    const bestDay = forecast.reduce((best, day) => {
        const currentScore = day.day.daily_chance_of_rain * -1 + (25 - Math.abs(day.day.avgtemp_c - 25));
        const bestScore = best ? (best.day.daily_chance_of_rain * -1 + (25 - Math.abs(best.day.avgtemp_c - 25))) : -Infinity;
        return currentScore > bestScore ? day : best;
    });
    
    if (bestDay) {
        const bestDayDate = new Date(bestDay.date);
        const bestDayName = bestDayDate.toLocaleDateString('en-US', { weekday: 'long' });
        document.getElementById('bestOutdoorDay').textContent = bestDayName;
    }
}

function suggestActivities(data) {
    const currentWeather = data.current;
    const forecast = data.forecast.forecastday;
    
    const currentSuggestions = getActivitySuggestions(
        currentWeather.condition.text,
        currentWeather.temp_c,
        currentWeather.humidity,
        currentWeather.wind_kph
    );
    
    const forecastSuggestions = forecast.map(day => {
        return {
            day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' }),
            activities: getActivitySuggestions(
                day.day.condition.text,
                day.day.avgtemp_c,
                day.day.avghumidity,
                day.day.maxwind_kph
            )
        };
    });
    
    displaySuggestions(currentSuggestions, forecastSuggestions);
}

function getActivitySuggestions(condition, temp, humidity, windSpeed) {
    const suggestions = [];
    const condition_lower = condition.toLowerCase();
    
    const userActivities = activities.filter(activity => {
        const weatherMatch = activity.weatherCondition === 'any' || 
                            condition_lower.includes(activity.weatherCondition) ||
                            (activity.weatherCondition === 'sunny' && condition_lower.includes('sun')) ||
                            (activity.weatherCondition === 'rainy' && condition_lower.includes('rain')) ||
                            (activity.weatherCondition === 'cloudy' && condition_lower.includes('cloud')) ||
                            (activity.weatherCondition === 'clear' && condition_lower.includes('clear'));
        
        const tempMatch = (!activity.minTemp || temp >= activity.minTemp) &&
                         (!activity.maxTemp || temp <= activity.maxTemp);
        
        return weatherMatch && tempMatch;
    });
    
    suggestions.push(...userActivities);
    
    if (suggestions.length === 0) {
        if (condition_lower.includes('sun') || condition_lower.includes('clear')) {
            if (temp > 30) {
                suggestions.push({
                    name: 'Swimming or Beach',
                    type: 'outdoor',
                    description: 'Perfect weather for water activities to cool down',
                    weatherCondition: 'sunny'
                });
                suggestions.push({
                    name: 'Indoor Shopping',
                    type: 'indoor',
                    description: 'Stay cool in air-conditioned malls',
                    weatherCondition: 'sunny'
                });
            } else if (temp > 25) {
                suggestions.push({
                    name: 'Hiking',
                    type: 'outdoor',
                    description: 'Great weather for nature trails',
                    weatherCondition: 'sunny'
                });
                suggestions.push({
                    name: 'Picnic in the Park',
                    type: 'outdoor',
                    description: 'Perfect for outdoor dining',
                    weatherCondition: 'sunny'
                });
            }
        } else if (condition_lower.includes('rain') || condition_lower.includes('drizzle')) {
            suggestions.push({
                name: 'Watch Movies',
                type: 'indoor',
                description: 'Perfect day for a movie marathon',
                weatherCondition: 'rainy'
            });
            suggestions.push({
                name: 'Read at Cafe',
                type: 'indoor',
                description: 'Cozy up with a book and hot drink',
                weatherCondition: 'rainy'
            });
            suggestions.push({
                name: 'Museum Visit',
                type: 'indoor',
                description: 'Explore art and history indoors',
                weatherCondition: 'rainy'
            });
        } else if (condition_lower.includes('cloud') || condition_lower.includes('overcast')) {
            suggestions.push({
                name: 'Outdoor Sports',
                type: 'outdoor',
                description: 'Cool weather perfect for sports',
                weatherCondition: 'cloudy'
            });
            suggestions.push({
                name: 'Photography',
                type: 'outdoor',
                description: 'Great lighting for photos',
                weatherCondition: 'cloudy'
            });
        }
        
        if (windSpeed > 30) {
            suggestions.push({
                name: 'Kite Flying',
                type: 'outdoor',
                description: 'Strong winds perfect for kites',
                weatherCondition: 'windy'
            });
        }
        
        if (humidity > 80) {
            suggestions.push({
                name: 'Spa Day',
                type: 'indoor',
                description: 'High humidity - perfect for indoor relaxation',
                weatherCondition: 'humid'
            });
        }
    }
    
    return suggestions.slice(0, 3);
}

function displaySuggestions(currentSuggestions, forecastSuggestions) {
    const currentDiv = document.getElementById('currentWeatherSuggestions');
    const forecastDiv = document.getElementById('forecastSuggestions');
    
    if (currentSuggestions.length > 0) {
        currentDiv.innerHTML = currentSuggestions.map(activity => `
            <div class="activity-item">
                <h4>${activity.name}</h4>
                <p>${activity.description || 'Recommended activity for current weather'}</p>
                <span class="activity-type ${activity.type}">${activity.type}</span>
            </div>
        `).join('');
    } else {
        currentDiv.innerHTML = '<p class="no-activities">No specific activity suggestions for current weather</p>';
    }
    
    if (forecastSuggestions.length > 0) {
        forecastDiv.innerHTML = forecastSuggestions.map(day => `
            <div class="forecast-day-suggestions">
                <h4>${day.day}</h4>
                ${day.activities.length > 0 ? day.activities.map(activity => `
                    <div class="activity-item">
                        <h4>${activity.name}</h4>
                        <p>${activity.description || 'Recommended activity'}</p>
                        <span class="activity-type ${activity.type}">${activity.type}</span>
                    </div>
                `).join('') : '<p class="no-activities">No specific suggestions</p>'}
            </div>
        `).join('');
    } else {
        forecastDiv.innerHTML = '<p class="no-activities">No forecast activity suggestions available</p>';
    }
}

window.addEventListener('storage', (e) => {
    if (e.key === 'weatherActivities') {
        loadActivities();
        getForecast();
    }
});