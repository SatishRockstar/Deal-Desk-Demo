using System;
using System.Collections.Generic;
using HeroBot.Models;

namespace HeroBot.DataStorage
{
	public interface IChatAdminThreadStore
	{
		// [thread id -> moderator id] 
		Dictionary<string, string> Store { get; }

		// [mri -> emoji]
		Dictionary<string, ContosoUserConfigModel> UseConfigStore { get; }
	}
}
