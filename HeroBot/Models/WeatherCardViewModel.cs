using System;
using Newtonsoft.Json.Linq;

namespace HeroBot.Models
{
    public class WeatherCardViewModel: CardViewModel
    {
        public string Name { get; set; }
        public string Country { get; set; }
        public double Dt { get; set; }
        public string Url { get; set; }
        public double Temp { get; set; }
        public double TempMax { get; set; }
        public double TempMin { get; set; }
    }
}
