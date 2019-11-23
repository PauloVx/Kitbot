const Discord = require('discord.js'); // Importing discord.js
const client  = new Discord.Client(); // Create an instance of a Discord client

const {token, prefix, GOOGLE_API_KEY} = require('./config') //Importing the config file.

const YouTube = require('simple-youtube-api');
const youtube = new YouTube(GOOGLE_API_KEY);

const ytdl = require("ytdl-core") //Importing Ytdl-core

const queue = new Map(); //Song Queue

client.on('warn', console.warn);
client.on('error', console.error);

client.on('ready', () =>{
	logToConsole('Sucessfully Logged In!')
	logToConsole(ffmpeg.path, ffmpeg.version);
	logToConsole(`Logged in as ${client.user.tag}!\n`);
});

client.on('disconnect', () =>{
	logToConsole(`${client.user.tag} has disconnected!`);
});

client.on('message', async message=>{
	if(!message.content.startsWith(prefix)) return; //Will return if the message doesn't start with the correct prefix.
	let args = message.content.substring(prefix.length).split(" ");
	const searchString = args.slice(1).join(' ');
	const serverQueue = queue.get(message.guild.id);

	switch(args[0])
	{
		case 'help': //Help command
			replyMessage(message, "Here's your help! \n\
		My command prefix is: `${prefix}`\n\
		My commands are:\n\
		`help` - Will send you this help message.\n\
		`pfp` - Will send you a link to your profile picture.\n\
		`clear` `Number of messages` - will delete a given number of messages.\n\
		`play` `Name/Url` - Will play a song.\n\
		`np` - Now Playing.\n\
		`queue` - Song Queue.\n\
		`stop` - Stops the song.\n\
		`skip` - Skips the song.\n\
		".replace("${prefix}", prefix))
		break;

		case 'pfp': //Pfp command
			replyMessage(message, 'Your Profile Picture URL: ')
			sendMessageToChannel(message, message.author.avatarURL);
		break;

		case 'clear': //clear command
			if(!args[1]) return message.reply('Error! This command requires 2 arguments, \nTry ${prefix}clear 1'.replace("${prefix}", prefix));
			message.channel.bulkDelete(args[1]);
		break;
		
		case 'play' :
			const voiceChannel = message.member.voiceChannel;
			if(!voiceChannel) return replyMessage(message, 'You need to be in a voice channel to play music!');

			const permissions = voiceChannel.permissionsFor(message.client.user);
			if(!permissions.has('CONNECT')) return replyMessage(message, 'I can\'t connect to your voice channel, make sure i have the proper permissions!');
			if(!permissions.has('SPEAK')) return replyMessage(message, 'I can\'t speak in your voice channel, make sure i have the proper permissions!');

			try
			{
				var video = await youtube.getVideo(args[1]); //args = url
			}
			catch (error)
			{
				try
				{
					var videos = await youtube.searchVideos(searchString, 1)
					var video = await youtube.getVideoByID(videos[0].id);
				}
				catch (erro)
				{
					console.error(erro);
					return sendMessageToChannel(message, 'I couldn\'t find any videos!');
				}
			}

			const song = {
				id: video.id,
				title: video.title,
				channelname: video.channel.title,
				url: `https://www.youtube.com/watch?v=${video.id}`
			};

			if(!serverQueue) 
			{
				const queueContruct = {
					textChannel: message.channel,
					voiceChannel: voiceChannel,
					connection: null,
					songs: [],
					volume: 5,
					playing: true
				};
				queue.set(message.guild.id, queueContruct);

				queueContruct.songs.push(song);

				try
				{
					var connection = await voiceChannel.join();
					queueContruct.connection = connection;
					play(message.guild, queueContruct.songs[0]);
				}
				catch(error)
				{
					console.error(`I couldn't join the voice channel: ${error}`);
					queue.delete(message.guild.id);
					return message.channel.send(`I couldn't join the voice channel: ${error}`);
				}
			}
			else
			{
				serverQueue.songs.push(song);
				logToConsole(`Queue: `);
				logToConsole(serverQueue.songs);
				logToConsole('\n');
				return sendMessageToChannel(message, `**${song.title}** has been added to the queue!`);
			}
		break;

		case 'np':
			if(!serverQueue) return replyMessage(message, 'There\'s nothing playing right now!');
			sendMessageToChannel(message, `Now Playing: **${serverQueue.songs[0].title} - ${serverQueue.songs[0].channelname}**`)
			
			if(!serverQueue.songs[1]) return sendMessageToChannel(message, 'There\'s no more songs in the queue!')
			sendMessageToChannel(message, `Next: **${serverQueue.songs[1].title} - ${serverQueue.songs[1].channelname}**`)
		break;

		case 'queue':
			if(!serverQueue) return replyMessage(message, 'There\'s nothing playing right now!');
			sendMessageToChannel(message, `
			__**Song Queue**__
${serverQueue.songs.map(song => `**__${song.title}__ - ${song.channelname}**`).join('\n')}
**Now Playing: - __${serverQueue.songs[0].title}__ - ${serverQueue.songs[0].channelname}**
			`);
	
		break;

		case 'stop' :
			if(!message.member.voiceChannel) return replyMessage(message, 'You need to be in a voice channel to use this command!');
			if(!serverQueue) return replyMessage(message, 'There\'s nothing playing right now!');
			serverQueue.songs = [];
			serverQueue.connection.dispatcher.end('Stop Command has been used!');
			logToConsole('Disconnected the voice channel!\n');
		break;

		case 'skip' :
			if(!message.member.voiceChannel) return replyMessage(message, 'You need to be in a voice channel to use this command!');
			if(!serverQueue) return replyMessage(message, 'There\'s nothing playing right now!');
			serverQueue.connection.dispatcher.end('Skip Command has been used!');
		break;
	}
})

//Sends a message to the text channel
function sendMessageToChannel(message, msg) //message = the command, msg is the actual message.
{
	message.channel.send(msg);
}

//Replys to the user that sent the command
function replyMessage(message, msg) //message = the command, msg is the actual message.
{
	message.reply(msg);
}

function logToConsole(msg) //Logs something to the console
{
	console.log(msg);
}

function play(guild, song)
{
	const serverQueue = queue.get(guild.id);

	if(!song)
	{
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}

	const dispatcher = serverQueue.connection.playStream(ytdl(song.url));

	dispatcher.on('start', () => 
	{
		logToConsole(`A song started playing!`);
		logToConsole(song); //Logs the "song" object to the console.
		serverQueue.textChannel.send(`Now Playing: **${song.title} - ${song.channelname}**`)

		logToConsole(`Queue: `);
		logToConsole(serverQueue.songs);
	})

	dispatcher.on('end', reason => 
	{
		logToConsole(`Finished playing ${song.title}!`);
		logToConsole(`Reason: ${reason}\n`);
		serverQueue.songs.shift();
		play(guild, serverQueue.songs[0]);
	})

	dispatcher.on('error', error => console.error(error));

	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5); //Volume
	dispatcher.setBitrate(192); //192kbps
}

client.login(token);