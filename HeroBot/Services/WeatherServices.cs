using System;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json.Linq;

namespace HeroBot.Services
{
    public class WeatherServices : IWeatherServices
    {
        //private static HttpClient _client;
        private IConfiguration _configuration;

        public WeatherServices(IConfiguration configuration)
        {
            //_client = client;
            _configuration = configuration;
        }

        public async Task<JObject> GetCurrentWeather(string location)
        {
            HttpClient _client = new HttpClient();
            var apiKey = _configuration["OpenWeatherMapAPIKey"];
            string weatherAPIUrl = $"https://api.openweathermap.org/data/2.5/weather?q={location}&appid={apiKey}&units=metric";

            HttpResponseMessage response = await _client.GetAsync(weatherAPIUrl);

            string weather = "";
            if (response.IsSuccessStatusCode)
            {
                weather = await response.Content.ReadAsStringAsync();
            }

            JObject json = JObject.Parse(weather);

            return json;
        }
    }
}
