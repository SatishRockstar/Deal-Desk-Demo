using System;
using System.Threading.Tasks;
using HeroBot.Models;
using Newtonsoft.Json.Linq;

namespace HeroBot.Services
{
    public interface ICardService
    {
        Task<dynamic> ReadCardSectionAsync(string section);
        WeatherCardViewModel PrepareWeatherData(JObject weatherDetails);
    }
}
