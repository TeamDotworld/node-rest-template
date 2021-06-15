import { Call, PrismaClient } from ".prisma/client";
import { Job } from 'bullmq';
import { Container } from "typedi";
import axios, { AxiosRequestConfig } from "axios"

async function notifySecuritys(job: Job) {
	try {
		const { list, device } = job.data
		const prisma: PrismaClient = Container.get("prisma");
		let i = 0;
		let userConnected: Call;
		async function notify() {
			if (i < list.length) {
				if (i) {
					userConnected = await prisma.call.findFirst({
						where: {
							status: "IN_PROGRESS",
							from: list[i - 1].id,
							// to: [device.id],
						}
					});
				}
				if (userConnected) {
					clearInterval(closeTimeInterval);
					return null;
				} else {
					let data = JSON.stringify({
						to: list[i].fcm_token,
						collapse_key: "type_a",
						data: {
							device_id: device.id,
							device_name: device.name,
						},
					});

					var config: AxiosRequestConfig = {
						method: "post",
						url: "https://fcm.googleapis.com/fcm/send",
						headers: {
							Authorization: `key=${process.env.SERVER_KEY}`,
							"Content-Type": "application/json",
							"Access-Control-Allow-Origin": "*",
						},
						data: data,
					};

					let response = await axios(config);
					i++;
					return response.data;
				}
			} else {
				clearInterval(closeTimeInterval);
				return null;
			}
		}
		await notify();
		let closeTimeInterval = setInterval(async () => {
			notify();
		}, 15000);
	} catch (error) {
		// logger.error(error.message || 'Notification sending process Stoped', { backtrace: error });
	}
}

async function notifyUsers(job: Job) {
	try {
		const { list, device } = job.data
		const prisma: PrismaClient = Container.get("prisma");
		let i = 0;
		let userConnected: Call;
		async function notify() {
			if (i < list.length) {
				if (i) {
					userConnected = await prisma.call.findFirst({
						where: {
							status: "IN_PROGRESS",
							from: list[i - 1].id,
							// to: [device.id],
						}
					});
				}
				if (userConnected) {
					clearInterval(closeTimeInterval);
					return null;
				} else {
					if (list[i]?.fcm_tokens.length) {
						let data = JSON.stringify({
							to: list[i]?.fcm_tokens[0],
							data: {
								title: `Incoming call`,
								body: `You have a incoming call from ${device.name}`,
								icon: "firebase-logo.png",
								data: {
									// todo :change url when front end is done
									url: `devices/${device.id}/${device.os_type}`,
								},
								actions: [
									{
										title: "Accept",
										action: "accept",
										icon: "icons/heart.png",
									},
									{
										title: "Reject",
										action: "reject",
										icon: "icons/cross.png",
									},
								],
							},
							webpush: {
								headers: {
									Urgency: "high",
									TTL: "4000",
								},
							},
						});

						let config: AxiosRequestConfig = {
							method: "POST",
							url: "https://fcm.googleapis.com/fcm/send",
							headers: {
								Authorization: `key=${process.env.SERVER_KEY}`,
								"Content-Type": "application/json",
								"Access-Control-Allow-Origin": "*",
							},
							data: data,
						};

						let response = await axios(config);
						i++;
						return response.data;
					} else {
						i++;
						return "Got an error from IAM";
					}
				}
			} else {
				clearInterval(closeTimeInterval);
				return null;
			}
		}
		await notify();
		let closeTimeInterval = setInterval(async () => {
			notify();
		}, 15000);
	} catch (error) {
		// logger.error(error.message || 'Notification sending process Stoped', { backtrace: error });
		return;
	}
}

export default {
	notifyUsers,
	notifySecuritys
}