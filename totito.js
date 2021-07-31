const app = require('express')();
const telegram = require('node-telegram-bot-api');
const token = '1911351139:AAHlT6RvDLpU6jo-En6Lolf_Y0OZMzY3Pgs';
const bot = new telegram(token, { polling: true });
const port = process.env.PORT || 4500;
const fs = require('fs');
const { table } = require('console');
const { isNumber } = require('util');
const { on } = require('events');
const { randomInt } = require('crypto');

// tablero plantilla
var tablero_vacio = [ [ ' ', ' ', ' ' ], [ ' ', ' ', ' ' ], [ ' ', ' ', ' ' ] ];

// Estados para el jugador
// 0 = disponible, 1 = retando, 2 = retado, 3 = en partida
var usuarios = [ { user: 0, id: 0, stat: 0 } ];

// 0 = stand by, 1 = acepto, 2 = cancelo/rechazo, 3 = termino
var retos = [ { retador: 0, retado: 0, resp: 0 } ];

// stat: 0 la partida sigue, 1 partida terminada
var partidas = [ { reto: 0, tablero: 0, stat: 0, turno: 0 } ];

bot.on('register', (msg) => {
	let name = msg.chat.first_name;
	let id = msg.chat.id;
	let registrado;
	usuarios.forEach((u) => {
		if (u.id == id) {
			registrado = true;
		}
	});
	if (!registrado) {
		usuarios.push({ user: name, id: id, stat: 0 });
		console.log(`se registro a ${name}`);
	}
});

bot.on('usuarios', (msg) => {
	let id = msg.chat.id;
	usuarios.forEach((u, i) => {
		if (u.id != 0) {
			bot.sendMessage(id, `usuario: ${u.user} code ${i}`);
		}
	});
});

bot.on('retar', (msg) => {
	let name = msg.chat.first_name;
	let id = msg.chat.id;
	usuarios.forEach((u) => {
		if (u.id == id) {
			u.stat = 1;
		}
	});
	console.log(`${name} esta retando`);
	usuarios.forEach((u, i) => {
		if (u.id != 0 && u.stat == 0) {
			bot.sendMessage(id, `user: ${u.user} code: ${i}`);
		}
	});
});

bot.on('no_retar', (msg) => {
	let name = msg.chat.first_name;
	let id = msg.chat.id;
	let reto_actual = retos.find((u) => {
		if (u.retador == id && u.resp == 0) {
			return u;
		} else if (u.retado == id && u.resp == 0) {
			return u;
		}
	});

	console.log(`${name} cancelo el reto`);
	usuarios.forEach((u) => {
		if (u.id == id) {
			u.stat = 0;
		}
	});
	bot.sendMessage(id, `cancelaste el reto`);
	if (reto_actual != undefined) {
		let usuario_retador = usuarios.find((u) => u.id == reto_actual.retador);
		let usuario_retado = usuarios.find((u) => u.id == reto_actual.retado);
		usuarios.forEach((u) => {
			if (u.id == usuario_retador.id) {
				u.stat = 0;
			}
			if (u.id == usuario_retado.id) {
				u.stat = 0;
			}
		});

		retos.forEach((u) => {
			if (u == reto_actual) {
				u.resp = 2;
			}
		});

		bot.sendMessage(usuario_retador.id, `reto cancelado contra ${usuario_retado.user}`);
		bot.sendMessage(usuario_retado.id, `reto cancelado contra ${usuario_retador.user}`);

		console.log(`se cancelo el reto ${usuario_retador.user} contra ${usuario_retado.user}`);
	}
});

bot.on('retando', (msg) => {
	let mensaje = msg.text.toLowerCase();
	let id = msg.chat.id;
	let usuario_actual = usuarios.find((u) => u.id == id);
	let reto_actual = retos.find((u) => {
		if (u.retador == id && u.resp == 0) {
			return u;
		}
	});

	if (reto_actual == undefined) {
		if (Number.isInteger(Number.parseInt(mensaje))) {
			let id_mensaje = Number.parseInt(mensaje);
			let id_temporal = usuarios[id_mensaje];
			if (id_temporal != undefined && id_temporal.id != id) {
				let user_valido;
				usuarios.forEach((u, i) => {
					if (i != 0 && i == mensaje) {
						u.stat = 2;
						user_valido = true;
						bot.sendMessage(id, `se envio el reto a ${u.user} espera que responda`);
						bot.sendMessage(u.id, `${usuario_actual.user} te ha mandado un reto`);
						retos.push({ retador: id, retado: u.id, resp: 0 });
						console.log(`${usuario_actual.user} esta retando a ${u.user}`);
					}
				});
				if (!user_valido) {
					bot.sendMessage(id, `no existe ese code de usuario - si deseas cancelar el reto escribe cancel`);
				}
				// console.log(`si es un numero ${mensaje}`);
			} else {
				bot.sendMessage(id, `code erroneo - si deseas cancelar el reto escribe cancel`);
			}
		} else {
			bot.sendMessage(id, `ese no es un numero men - si deseas cancelar el reto escribe cancel`);
			// console.log(`no es un numero ${mensaje}`);
		}
	} else {
		let usuario_retado = usuarios.find((u) => u.id == reto_actual.retado);
		bot.sendMessage(id, `espera a que ${usuario_retado.user} te acepte el reto`);
		bot.sendMessage(usuario_retado.id, `${usuario_actual.user} esta esperando tu respueta`);
	}
});

bot.on('aceptar_reto', (msg) => {
	let mensaje = msg.text.toLowerCase();
	let id = msg.chat.id;
	let indice_reto;
	if (mensaje == 'aceptar') {
		let reto_actual = retos.find((u) => {
			if (u.retador == id && u.resp == 0) {
				return u;
			} else if (u.retado == id && u.resp == 0) {
				return u;
			}
		});
		let usuario_retador = usuarios.find((u) => u.id == reto_actual.retador);
		let usuario_retado = usuarios.find((u) => u.id == reto_actual.retado);

		usuarios.forEach((u) => {
			if (u.id == usuario_retador.id) {
				u.stat = 3;
			}
			if (u.id == usuario_retado.id) {
				u.stat = 3;
			}
		});
		retos.forEach((u, i) => {
			if (u == reto_actual) {
				u.resp = 1;
				indice_reto = i;
			}
		});

		bot.sendMessage(usuario_retador.id, `inicio reto contra ${usuario_retado.user}`);
		bot.sendMessage(usuario_retado.id, `inicio reto contra ${usuario_retador.user}`);

		let c0 = [ ...tablero_vacio[0] ];
		let c1 = [ ...tablero_vacio[1] ];
		let c2 = [ ...tablero_vacio[2] ];

		let tablero_nuevo = [ [ ...c0 ], [ ...c1 ], [ ...c2 ] ];

		let n_random = Math.round(Math.random() * (1 - 0) + 0);
		// if turno: 0 = retardor , 1 = retado
		partidas.push({ reto: indice_reto, tablero: tablero_nuevo, stat: 0, turno: n_random });
		if (n_random == 0) {
			bot.sendMessage(usuario_retador.id, `Comienza: ${usuario_retador.user}`);
			bot.sendMessage(usuario_retado.id, `Comienza: ${usuario_retador.user}`);
		} else {
			bot.sendMessage(usuario_retador.id, `Comienza: ${usuario_retado.user}`);
			bot.sendMessage(usuario_retado.id, `Comienza: ${usuario_retado.user}`);
		}
		console.log(`reto creado y comienza ${n_random}`);

		bot.sendMessage(
			usuario_retador.id,
			`
			Tablero Real
			||	 	||	 
			||	 	||	 
			||	 	||	 
			
			Controles
		/00	||	/01	||	/02
		/10	||	/11	||	/12
		/20	||	/21	||	/22
		`
		);
		bot.sendMessage(
			usuario_retado.id,
			`
			Tablero Real
			||	 	||	 
			||	 	||	 
			||	 	||	 
			
			Controles
		/00	||	/01	||	/02
		/10	||	/11	||	/12
		/20	||	/21	||	/22
		`
		);
	} else {
		bot.sendMessage(id, `para iniciar la partida escribe "aceptar" y sino envia "cancel"`);
	}
});

bot.on('partida', (msg) => {
	let ganador = null,
		empate;
	let mensaje = msg.text.toLowerCase();
	let id = msg.chat.id;
	let code_reto_actual;
	let reto_actual = retos.find((u) => {
		if (u.retador == id && u.resp == 1) {
			return u;
		} else if (u.retado == id && u.resp == 1) {
			return u;
		}
	});

	retos.forEach((u, i) => {
		if (u == reto_actual) {
			code_reto_actual = i;
		}
	});

	let usuario_retador = usuarios.find((u) => u.id == reto_actual.retador);
	let usuario_retado = usuarios.find((u) => u.id == reto_actual.retado);

	let partida_actual = partidas.find((u) => {
		if (u.reto == code_reto_actual && u.stat == 0) {
			return u;
		}
	});

	const colocar_x = (x, y) => {
		partidas.forEach((u) => {
			if (u.reto == code_reto_actual && u.tablero[x][y] == ' ') {
				u.tablero[x][y] = 'X';
				u.turno = 1;
			}
		});
	};

	const colocar_0 = (x, y) => {
		partidas.forEach((u) => {
			if (u.reto == code_reto_actual && u.tablero[x][y] == ' ') {
				u.tablero[x][y] = '0';
				u.turno = 0;
			}
		});
	};

	const revisar_ganador = () => {
		for (let i = 0; i < 3; i++) {
			if (
				partida_actual.tablero[0][i] === partida_actual.tablero[1][i] &&
				partida_actual.tablero[0][i] === partida_actual.tablero[2][i] &&
				partida_actual.tablero[0][i] != ' '
			) {
				ganador = partida_actual.tablero[0][i];
				console.log(`el ganandor es ${ganador}`);
			} else if (
				partida_actual.tablero[i][0] === partida_actual.tablero[i][1] &&
				partida_actual.tablero[i][0] === partida_actual.tablero[i][2] &&
				partida_actual.tablero[i][0] != ' '
			) {
				ganador = partida_actual.tablero[i][0];
				console.log(`el ganandor es ${ganador}`);
			}
		}
		if (
			partida_actual.tablero[0][0] === partida_actual.tablero[1][1] &&
			partida_actual.tablero[0][0] === partida_actual.tablero[2][2] &&
			partida_actual.tablero[0][0] != ' '
		) {
			ganador = partida_actual.tablero[1][1];
			console.log(`el ganandor es ${ganador}`);
		}
		if (
			partida_actual.tablero[0][2] === partida_actual.tablero[1][1] &&
			partida_actual.tablero[0][2] === partida_actual.tablero[2][0] &&
			partida_actual.tablero[0][2] != ' '
		) {
			ganador = partida_actual.tablero[1][1];
			console.log(`el ganandor es ${ganador}`);
		}

		if (ganador != null) {
			partidas.forEach((u) => {
				if (u.reto == code_reto_actual) {
					u.stat = 1;
				}
			});
			retos.forEach((u, i) => {
				if (i == code_reto_actual) {
					u.resp = 3;
				}
			});
			usuarios.forEach((u) => {
				if (u.id == usuario_retador.id) {
					u.stat = 0;
				} else if (u.id == usuario_retado.id) {
					u.stat = 0;
				}
			});

			bot.sendMessage(usuario_retador.id, `Ya hay ganador, partida Terminada`);
			bot.sendMessage(usuario_retado.id, `Ya hay ganador, partida Terminada`);
		}
	};

	// revisar_ganador();

	if (ganador == null) {
		if (partida_actual.turno == 0 && id == usuario_retador.id) {
			switch (mensaje) {
				case '/00':
					colocar_x(0, 0);
					break;
				case '/01':
					colocar_x(0, 1);
					break;
				case '/02':
					colocar_x(0, 2);
					break;
				case '/10':
					colocar_x(1, 0);
					break;
				case '/11':
					colocar_x(1, 1);
					break;
				case '/12':
					colocar_x(1, 2);
					break;
				case '/20':
					colocar_x(2, 0);
					break;
				case '/21':
					colocar_x(2, 1);
					break;
				case '/22':
					colocar_x(2, 2);
					break;

				default:
					bot.sendMessage(
						id,
						`comando invalido porfavor selecciona en los controles la posicion en donde deseas colocarte`
					);
					break;
			}
		} else if (partida_actual.turno == 1 && id == usuario_retado.id) {
			switch (mensaje) {
				case '/00':
					colocar_0(0, 0);
					break;
				case '/01':
					colocar_0(0, 1);
					break;
				case '/02':
					colocar_0(0, 2);
					break;
				case '/10':
					colocar_0(1, 0);
					break;
				case '/11':
					colocar_0(1, 1);
					break;
				case '/12':
					colocar_0(1, 2);
					break;
				case '/20':
					colocar_0(2, 0);
					break;
				case '/21':
					colocar_0(2, 1);
					break;
				case '/22':
					colocar_0(2, 2);
					break;

				default:
					bot.sendMessage(
						id,
						`comando invalido porfavor selecciona en los controles la posicion en donde deseas colocarte`
					);
					break;
			}
		} else {
			bot.sendMessage(id, `no es tu turno, espera`);
		}
		empate = 0;
		for (let i = 0; i < 3; i++) {
			for (let j = 0; j < 3; j++) {
				if (partida_actual.tablero[i][j] != ' ') {
					empate += 1;
				}
			}
		}

		if (empate == 9) {
			console.log(`fue empate`);
			partidas.forEach((u) => {
				if (u.reto == code_reto_actual) {
					u.stat = 1;
				}
			});
			retos.forEach((u, i) => {
				if (i == code_reto_actual) {
					u.resp = 3;
				}
			});
			usuarios.forEach((u) => {
				if (u.id == usuario_retador.id) {
					u.stat = 0;
				} else if (u.id == usuario_retado.id) {
					u.stat = 0;
				}
			});
			bot.sendMessage(usuario_retador.id, `Empate`);
			bot.sendMessage(usuario_retado.id, `Empate`);
		} else {
			bot.sendMessage(
				usuario_retador.id,
				`
		
				Tablero Real
			${partida_actual.tablero[0][0]}	||	${partida_actual.tablero[0][1]}	||	${partida_actual.tablero[0][2]}
			${partida_actual.tablero[1][0]}	||	${partida_actual.tablero[1][1]}	||	${partida_actual.tablero[1][2]}
			${partida_actual.tablero[2][0]}	||	${partida_actual.tablero[2][1]}	||	${partida_actual.tablero[2][2]}
		
				Controles
			/00	||	/01	||	/02
			/10	||	/11	||	/12
			/20	||	/21	||	/22
		
			
			`
			);

			bot.sendMessage(
				usuario_retado.id,
				`
		
				Tablero Real
			${partida_actual.tablero[0][0]}	||	${partida_actual.tablero[0][1]}	||	${partida_actual.tablero[0][2]}
			${partida_actual.tablero[1][0]}	||	${partida_actual.tablero[1][1]}	||	${partida_actual.tablero[1][2]}
			${partida_actual.tablero[2][0]}	||	${partida_actual.tablero[2][1]}	||	${partida_actual.tablero[2][2]}
		
				Controles
			/00	||	/01	||	/02
			/10	||	/11	||	/12
			/20	||	/21	||	/22
		
			
			`
			);
			if (partida_actual.turno == 1) {
				bot.sendMessage(usuario_retador.id, `Es el turno de ${usuario_retado.user}`);
				bot.sendMessage(usuario_retado.id, `Es el turno de ${usuario_retado.user}`);
			} else if (partida_actual.turno == 0) {
				bot.sendMessage(usuario_retador.id, `Es el turno de ${usuario_retador.user}`);
				bot.sendMessage(usuario_retado.id, `Es el turno de ${usuario_retador.user}`);
			}
		}
		revisar_ganador();
	}

	console.table(partida_actual.tablero);
});

bot.on('text', (msg) => {
	let mensaje = msg.text.toLowerCase();
	let id = msg.chat.id;
	bot.emit('register', msg);
	let usuario_actual = usuarios.find((u) => u.id == id);

	if (usuario_actual.stat == 0) {
		switch (mensaje) {
			case 'prueba':
				bot.sendMessage(id, `Esta es una prueba`);
				break;
			case 'retar':
				bot.sendMessage(id, `Los usuarios que puedes retar son:`);
				bot.emit('retar', msg);
				break;
			case 'usuarios':
				bot.sendMessage(id, `Los usuarios registrados son!`);
				bot.emit('usuarios', msg);
				break;
			case 'crush':
				bot.sendMessage(id, `Este es para ti crush :3`);
				break;

			default:
				bot.sendMessage(id, `Comienza una partida con la palabra "retar"`);
				break;
		}
	} else if (usuario_actual.stat == 1) {
		switch (mensaje) {
			case 'usuarios':
				bot.sendMessage(id, `Los usuarios que puedes retar son:`);
				bot.emit('retar', msg);
				break;
			case 'cancel':
				bot.emit('no_retar', msg);
				break;

			default:
				// bot.sendMessage(id, `Que paso? te asustaste?`);
				bot.emit('retando', msg);
				break;
		}
	} else if (usuario_actual.stat == 2) {
		switch (mensaje) {
			case 'cancel':
				bot.emit('no_retar', msg);
				break;

			default:
				bot.emit('aceptar_reto', msg);
				break;
		}
	} else if (usuario_actual.stat == 3) {
		bot.emit('partida', msg);
	}

	console.log(`${usuario_actual.user} - ${usuario_actual.stat}`);
});

app.listen(port, () => {
	console.log('servidor activo');
});
