# Incident: 2025-12-02 11:50-12:05 UTC

## Summary

Between 11:50 and 12:05 UTC on December 2, 2025, all JWT pizza purchase requests began failing with 500 errors. The event was triggered by a chaos injection test initiated by the Pizza Factory vendor account.

The chaos injection caused 100% of pizza purchase attempts to fail, preventing all users from completing orders. The event was detected immediately through Grafana dashboard monitoring. The team started working on the event by examining request/response logs and identifying the chaos injection source. This high-severity incident affected 100% of users attempting to make pizza purchases during the incident window.

No external support tickets were raised as this was a controlled chaos testing scenario, but the incident demonstrated the importance of proper alerting configuration and rapid incident response procedures.

## Detection

This incident was detected instantly at 11:50 UTC when the on-call engineer noticed anomalies in the Grafana dashboard, specifically observing a spike in pizza purchase failures and error rates.

The engineer was actively monitoring the dashboard at the time, which enabled immediate detection. However, the alert configuration was misconfigured, which could have delayed detection if the engineer had not been actively watching the dashboard.

An improved alert configuration will be set up to ensure automatic paging occurs when pizza purchase failure rates exceed thresholds, so that incidents can be detected even when engineers are not actively monitoring dashboards. Doing this would help consistent resolve times.

## Impact

For approximately 15 minutes between 11:50 UTC and 12:05 UTC on December 2, 2025, all users attempting to make pizza purchases experienced complete order failures.

This incident affected 100% of users attempting to make purchases during the incident window.

## Timeline

All times are UTC.

- _11:50_ - Chaos injection detected via Grafana dashboard monitoring - pizza purchase failure rate spiked to 100%
- _11:51_ - Engineer confirmed error by examining dashboard metrics showing all order requests failing
- _11:52_ - Investigation began by examining request and response logs
- _11:53_ - Grepped logs for "fail" and found error response indicating chaos injection was active
- _11:54_ - Identified error message containing link to resolve the chaos injection
- _11:55_ - Followed resolution link provided in the chaos error response
- _12:00_ - Chaos injection disabled via the resolution mechanism
- _12:02_ - Service began stabilizing as pizza purchase requests started succeeding again
- _12:05_ - Service fully restored and all pizza purchases functioning normally
- _12:10_ - Alert configuration corrected to properly detect similar incidents in the future

## Response

After detecting the incident at 11:50 UTC through Grafana dashboard monitoring, the on-call engineer immediately began investigation.

The engineer confirmed the error by examining dashboard metrics, then investigated by searching through request and response logs. The investigation process was straightforward as the chaos injection error messages contained explicit information about the source and resolution path.

No delays were encountered in the response, as the engineer was actively monitoring the dashboard and the chaos injection system provided clear error messages with resolution instructions.

## Root cause

The root cause was an active chaos injection test initiated by the Pizza Factory vendor account, which was configured to randomly fail pizza orders. The chaos injection mechanism was functioning as designed for testing purposes, but resulted in 100% failure rate rather than the expected failure rate.


## Resolution

The service was restored by following the resolution link provided in the chaos injection error response, which allowed the engineer to disable the chaos injection mechanism.

The resolution process was straightforward:
1. Identified the chaos injection source through log analysis
2. Followed the resolution link provided in the error message
3. Disabled the chaos injection via the provided mechanism
4. Monitored dashboard metrics to confirm service stabilization
5. Verified normal operation by observing successful pizza purchases

Time to mitigation could be improved by:
- Configuring proper alerts to automatically detect pizza purchase failure rate spikes
- Creating runbooks for common chaos injection scenarios
- Implementing automated resolution procedures for known chaos injection patterns


## Prevention

This incident was part of a controlled chaos testing scenario, so similar incidents may occur intentionally as part of resilience testing. However, the misconfigured alerting represents a gap that should be addressed.

The alert configuration issue could potentially affect detection of other types of incidents beyond chaos testing, such as actual production failures or system degradations.

## Action items

1. Fix alert configuration to automatically detect and page on pizza purchase failure rate thresholds exceeding normal baseline
2. Create runbook documentation for chaos injection scenarios and resolution procedures
3. Review chaos injection parameters to ensure they match expected failure rates (50% vs 100% observed)
4. Implement automated testing of alert configurations to prevent misconfiguration in the future
