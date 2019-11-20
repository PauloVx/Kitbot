const Discord = require('discord.js'); // Importing discord.js
const client  = new Discord.Client(); // Create an instance of a Discord client

const {token, prefix} = require('./config') //Importing the config file.

const ytdl = require("ytdl-core") //Importing Ytdl-core

const queue = new Map(); //Song Queue

client.on('warn', console.warn);
client.on('error', console.error);

client.on('ready', () =>{
	console.log('Sucessfully Logged In!')
	console.log(`Logged in as ${client.user.tag}!\n`);
});

client.on('disconnect', () =>{
	console.log(`${client.user.tag} has disconnected!`);
});

client.on('message', async message=>{
	if(!message.content.startsWith(prefix)) return; //Will return if the message doesn't start with the correct prefix.
	let args = message.content.substring(prefix.length).split(" ");
	
	const serverQueue = queue.get(message.guild.id);

	switch(args[0])
	{
		case 'help': //Help command
			message.reply("Here's your help! \n\
		My command prefix is: `${prefix}`\n\
		My commands are:\n\
		`help` - Will send you this help message.\n\
		`pfp` - Will send you a link to your profile picture.\n\
		`clear` `Number of messages` - will delete a given number of messages.\n\
		`play` `Url` - Will play a song.\n\
		`stop` - Stops the song.\n\
		`skip` - Skips the song.\n\
		".replace("${prefix}", prefix))
		break;

		case 'pfp': //Pfp command
			message.reply('Your Profile Picture URL: ')
			message.channel.send(message.author.avatarURL);
		break;

		case 'clear': //clear command
			if(!args[1]) return message.reply('Error! This command requires 2 arguments, \nTry ${prefix}clear 1'.replace("${prefix}", prefix));
			message.channel.bulkDelete(args[1]);
		break;
		
		case 'play' :
			const voiceChannel = message.member.voiceChannel;
			if(!voiceChannel) return message.reply('You need to be in a voice channel to play music!');

			const permissions = voiceChannel.permissionsFor(message.client.user);
			if(!permissions.has('CONNECT')) return message.reply('I can\'t connect to your voice channel, make sure i have the proper permissions!');
			if(!permissions.has('SPEAK')) return message.reply('I can\'t speak in your voice channel, make sure i have the proper permissions!');

			const songInfo = await ytdl.getInfo(args[1]);
			const song = {
				title: songInfo.title,
				channelname: songInfo.author.name,
				artist: songInfo.media.artist,
				url: songInfo.video_url
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
				console.log(`Queue: `);
				console.log(serverQueue.songs);
				console.log('\n');
				return message.channel.send(`**${song.title}** has been added to the queue!`);
			}
		break;

		case 'stop' :
			if(!message.member.voiceChannel) return message.reply('You need to be in a voice channel to use this command!');
			if(!serverQueue) return message.reply('There\'s nothing playing right now!');
			serverQueue.songs = [];
			serverQueue.connection.dispatcher.end();
			console.log('Disconnected the voice channel!\n');
		break;

		case 'skip' :
			if(!message.member.voiceChannel) return message.reply('You need to be in a voice channel to use this command!');
			if(!serverQueue) return message.reply('There\'s nothing playing right now!');
			serverQueue.connection.dispatcher.end();
		break;
	}
})

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
		console.log(`A song started playing!`);
		console.log(song); //Logs the "song" object to the console.
		if(song.artist === undefined) //Sometimes youtube doesn't give you the artist name so this will at least show the name of the channel.
			serverQueue.textChannel.send(`Currently Playing: **${song.title} - ${song.channelname}**`)
		else
			serverQueue.textChannel.send(`Currently Playing: **${song.title} - ${song.artist}**`)

		console.log(`Queue: `);
		console.log(serverQueue.songs);
	})

	dispatcher.on('end', () => 
	{
		console.log(`Finished playing ${song.title}!\n`);
		serverQueue.songs.shift();
		play(guild, serverQueue.songs[0]);
	})

	dispatcher.on('error', error => console.error(error));

	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5); //Volume
	dispatcher.setBitrate(192); //192kbps
}

client.login(token);