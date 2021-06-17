using System;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace HeroBot.Services
{
    public interface IWeatherServices
    {
        Task<JObject> GetCurrentWeather(string location);
    }
}
