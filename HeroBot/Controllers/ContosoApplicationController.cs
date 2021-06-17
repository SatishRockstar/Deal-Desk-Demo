using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HeroBot.DataStorage;
using HeroBot.Models;
using Microsoft.AspNetCore.Mvc;

// For more information on enabling MVC for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace HeroBot.Controllers
{
	[ApiController]
	public class ContosoApplicationController
	{
		IChatAdminThreadStore _store;

		public ContosoApplicationController(IChatAdminThreadStore store)
		{
			_store = store;
		}

		/// <summary>
		/// Add the user to the thread if possible
		/// </summary>
		/// <param name="threadId"></param>
		/// <param name="user"></param>
		/// <returns>200 if successful and </returns>
		[Route("userConfig/{userId}")]
		[HttpPost]
		public string SetUserConfiguration(string userId, ContosoUserConfigModel userConfig)
		{
			_store.UseConfigStore[userId] = userConfig;
			return userId;
		}

		/// <summary>
		/// If the only user is the moderator, then we will try to remove the moderator and delete the thread
		/// </summary>
		/// <param name="threadId"></param>
		/// <returns></returns>
		/// <remarks>Optional for client to send but it would be nice to clean up un-used chat threads</remarks>
		[Route("userConfig/{userId}")]
		[HttpGet]
		public ContosoUserConfigModel GetUserConfiguration(string userId)
		{
			try
			{
				return _store.UseConfigStore[userId];
			}
			catch
			{
				return new ContosoUserConfigModel()
				{
					Emoji = "🐱"
				};
			}
		}
	}
}
