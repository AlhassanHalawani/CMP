"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordPageView = recordPageView;
exports.getTraffic = getTraffic;
const pageView_model_1 = require("../models/pageView.model");
function deriveDeviceType(userAgent) {
    if (!userAgent)
        return 'unknown';
    const ua = userAgent.toLowerCase();
    if (/tablet|ipad/.test(ua))
        return 'tablet';
    if (/mobile|android|iphone|ipod/.test(ua))
        return 'mobile';
    if (ua.length > 0)
        return 'desktop';
    return 'unknown';
}
function recordPageView(req, res) {
    const { session_id, path, referrer } = req.body;
    if (!session_id || !path) {
        res.status(400).json({ error: 'session_id and path are required' });
        return;
    }
    const userAgent = req.headers['user-agent'] ?? '';
    const device_type = deriveDeviceType(userAgent);
    const user_id = req.user?.id ?? null;
    pageView_model_1.PageViewModel.create({ session_id, path, device_type, referrer, user_id });
    res.status(204).send();
}
function getTraffic(req, res) {
    const rangeParam = req.query.range;
    const range = rangeParam === '7d' || rangeParam === '30d' || rangeParam === '90d' ? rangeParam : '30d';
    const data = pageView_model_1.PageViewModel.getTraffic(range);
    res.json(data);
}
//# sourceMappingURL=analytics.controller.js.map