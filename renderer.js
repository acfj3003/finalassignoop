const API_KEY = '32804b24a847407391c53709241010';
const BASE_URL = 'https://api.weatherapi.com/v1';

let activities = [];
let currentEditId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadActivities();
    setupEventListeners();
    getWeatherData('Malaysia');
});

function setupEventListeners() {
    document.getElementById('searchBtn').addEventListener('click', () => {
        const location = document.getElementById('locationInput').value;
        getWeatherData(location);
    });

    document.getElementById('locationInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('searchBtn').click();
        }
    });

    document.getElementById('saveActivityBtn').addEventListener('click', saveActivity);
    document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
}

async function getWeatherData(location) {
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';

    try {
        const response = await fetch(`${BASE_URL}/forecast.json?key=${API_KEY}&q=${location}&days=3&aqi=no&alerts=no`);
        
        if (!response.ok) {
            throw new Error('Location not found');
        }

        const data = await response.json();
        displayWeatherData(data);
        displayAnalytics(data);
        
        document.getElementById('analyticsSection').style.display = 'block';
        
    } catch (error) {
        alert('Error fetching weather data: ' + error.message);
        document.getElementById('weatherDisplay').innerHTML = `
            <div class="weather-loading">Error: ${error.message}</div>
        `;
    } finally {
        spinner.style.display = 'none';
    }
}

function displayWeatherData(data) {
    const weatherDisplay = document.getElementById('weatherDisplay');
    const current = data.current;
    const location = data.location;

    weatherDisplay.innerHTML = `
        <div class="weather-header">
            <h3>${location.name}, ${location.country}</h3>
            <p>Local Time: ${location.localtime}</p>
        </div>
        <div class="weather-main">
            <div class="weather-temp">
                <span class="temp-value">${current.temp_c}°C</span>
                <span class="feels-like">Feels like ${current.feelslike_c}°C</span>
            </div>
            <div class="weather-condition">
                <img src="https:${current.condition.icon}" alt="${current.condition.text}">
                <span>${current.condition.text}</span>
            </div>
        </div>
        <div class="weather-details">
            <div class="detail-item">
                <span class="detail-label">Humidity:</span>
                <span class="detail-value">${current.humidity}%</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Wind:</span>
                <span class="detail-value">${current.wind_kph} km/h</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Pressure:</span>
                <span class="detail-value">${current.pressure_mb} mb</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">UV Index:</span>
                <span class="detail-value">${current.uv}</span>
            </div>
        </div>
    `;
}

function displayAnalytics(data) {
    const forecast = data.forecast.forecastday;
    
    const temperatures = forecast.map(day => day.day.avgtemp_c);
    const currentTemp = data.current.temp_c;
    const avgTemp = (temperatures.reduce((a, b) => a + b, 0) / temperatures.length).toFixed(1);
    const maxTemp = Math.max(...forecast.map(day => day.day.maxtemp_c));
    const minTemp = Math.min(...forecast.map(day => day.day.mintemp_c));

    document.getElementById('currentTemp').textContent = `${currentTemp}°C`;
    document.getElementById('avgTemp').textContent = `${avgTemp}°C`;
    document.getElementById('maxTemp').textContent = `${maxTemp}°C`;
    document.getElementById('minTemp').textContent = `${minTemp}°C`;

    const rainyDays = forecast.filter(day => day.day.daily_chance_of_rain > 50);
    const rainRisk = rainyDays.length > 0 ? 'High' : (forecast.some(day => day.day.daily_chance_of_rain > 20) ? 'Medium' : 'Low');
    
    const rainRiskElement = document.getElementById('rainRisk');
    rainRiskElement.textContent = rainRisk + ' Risk';
    rainRiskElement.className = `risk-indicator risk-${rainRisk.toLowerCase()}`;

    const rainDetails = forecast.map(day => {
        return `${new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}: ${day.day.daily_chance_of_rain}% rain`;
    }).join('<br>');
    
    document.getElementById('rainDetails').innerHTML = rainDetails;
}

function saveActivity() {
    const activityData = {
        id: currentEditId || Date.now().toString(),
        name: document.getElementById('activityName').value,
        type: document.getElementById('activityType').value,
        weatherCondition: document.getElementById('weatherCondition').value,
        minTemp: parseFloat(document.getElementById('minTempCondition').value) || null,
        maxTemp: parseFloat(document.getElementById('maxTempCondition').value) || null,
        description: document.getElementById('activityDesc').value
    };

    if (!activityData.name || !activityData.type || !activityData.weatherCondition) {
        alert('Please fill in all required fields');
        return;
    }

    if (currentEditId) {
        const index = activities.findIndex(a => a.id === currentEditId);
        if (index !== -1) {
            activities[index] = activityData;
        }
    } else {
        activities.push(activityData);
    }

    saveActivitiesToLocal();
    resetForm();
    displayActivities();
}

function loadActivities() {
    const saved = localStorage.getItem('weatherActivities');
    if (saved) {
        activities = JSON.parse(saved);
    }
    displayActivities();
}

function saveActivitiesToLocal() {
    localStorage.setItem('weatherActivities', JSON.stringify(activities));
}

function editActivity(id) {
    const activity = activities.find(a => a.id === id);
    if (activity) {
        currentEditId = id;
        document.getElementById('activityName').value = activity.name;
        document.getElementById('activityType').value = activity.type;
        document.getElementById('weatherCondition').value = activity.weatherCondition;
        document.getElementById('minTempCondition').value = activity.minTemp || '';
        document.getElementById('maxTempCondition').value = activity.maxTemp || '';
        document.getElementById('activityDesc').value = activity.description || '';
        document.getElementById('formTitle').textContent = 'Edit Activity';
        document.getElementById('saveActivityBtn').textContent = 'Update Activity';
        document.getElementById('cancelEditBtn').style.display = 'inline-block';
    }
}

function deleteActivity(id) {
    if (confirm('Are you sure you want to delete this activity?')) {
        activities = activities.filter(a => a.id !== id);
        saveActivitiesToLocal();
        displayActivities();
        
        if (currentEditId === id) {
            resetForm();
        }
    }
}

function displayActivities() {
    const tbody = document.getElementById('activitiesBody');
    
    if (activities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No activities added yet</td></tr>';
        return;
    }

    tbody.innerHTML = activities.map(activity => `
        <tr>
            <td>${activity.name}</td>
            <td>${activity.type}</td>
            <td>${activity.weatherCondition}</td>
            <td>${activity.minTemp || '-'} - ${activity.maxTemp || '-'}°C</td>
            <td>${activity.description || '-'}</td>
            <td>
                <button class="btn-edit" onclick="editActivity('${activity.id}')">Edit</button>
                <button class="btn-danger" onclick="deleteActivity('${activity.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function resetForm() {
    document.getElementById('activityName').value = '';
    document.getElementById('activityType').value = 'outdoor';
    document.getElementById('weatherCondition').value = 'sunny';
    document.getElementById('minTempCondition').value = '';
    document.getElementById('maxTempCondition').value = '';
    document.getElementById('activityDesc').value = '';
    document.getElementById('formTitle').textContent = 'Add New Activity Recommendation';
    document.getElementById('saveActivityBtn').textContent = 'Save Activity';
    document.getElementById('cancelEditBtn').style.display = 'none';
    currentEditId = null;
}

function cancelEdit() {
    resetForm();
}

window.editActivity = editActivity;
window.deleteActivity = deleteActivity;