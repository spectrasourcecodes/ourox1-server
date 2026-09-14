const cron = require("node-cron");
const investmentService = require("../services/investmentService");
const logger = require("../utils/logger");

let isRunning = false;
const startROICalculation = () => {
    logger.info("Daily ROI scheduler started.");
    cron.schedule(
        "0 0 * * *",
        async () => {
            if (isRunning) {
                logger.warn("ROI job already running.");
                return;
            }
            isRunning = true;
            try {
                logger.info("Starting daily ROI calculation...");
                const result =
                    await investmentService.calculateDailyROI();
                logger.info(
                    `ROI completed. Processed ${result.processed}, Completed ${result.completed}`
                );
            } catch (err) {
                logger.error(err);
            } finally {
                isRunning = false;
            }
        },
        {
            timezone: "UTC"
        }
    );
};

module.exports = startROICalculation;