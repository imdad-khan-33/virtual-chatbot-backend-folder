import Router from "express"
import { verifyJwt } from "../middleware/auth.middlewares.js"
import { chat, getTherapyChatById, getUserAllTherapyChat, streamChat } from "../controllers/therapyChat.controller.js"

const router = Router()

router.route('/chat').post(verifyJwt, chat)
router.route('/chat/stream').post(streamChat) //streamChat
router.route('/chat/sessionInfo').get(verifyJwt, getUserAllTherapyChat)
router.route('/chat/:sessionId').post(verifyJwt, chat)
router.route('/chat/:sessionId').get(verifyJwt, getTherapyChatById)


export default router