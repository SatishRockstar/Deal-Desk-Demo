using System;
using System.IO;
using System.Threading.Tasks;
using HeroBot.Models;
using Newtonsoft.Json.Linq;

namespace HeroBot.Services
{
    public class CardService: ICardService
    {
        public WeatherCardViewModel PrepareWeatherData(JObject weatherDetails)
        {
            string icon = (string)weatherDetails.SelectToken("weather[0].icon");
            return new WeatherCardViewModel()
            {
                Name = (string)weatherDetails["name"],
                Country = (string)weatherDetails.SelectToken("sys.country"),
                Dt = (double)weatherDetails["dt"],
                Temp = (double)weatherDetails.SelectToken("main.temp"),
                TempMax = (double)weatherDetails.SelectToken("main.temp_max"),
                TempMin = (double)weatherDetails.SelectToken("main.temp_min"),
                Url = $"http://openweathermap.org/img/wn/{icon}@2x.png"
            };
        }

        public async Task<dynamic> ReadCardSectionAsync(string section)
        {
            var CardSettings = await ReadCardSettingsAsync();
            return CardSettings[section];
        }

        private async Task<dynamic> ReadCardSettingsAsync()
        {
            var cardSettingsString = await File.ReadAllTextAsync("cardsettings.json");

            dynamic fileContent = JToken.Parse(cardSettingsString);

            return fileContent;

        }
    }
}
