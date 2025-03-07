import path from 'path';
import convict from 'convict';
import { Container } from 'typedi';
import { InstanceSettings } from 'n8n-core';
import { LOG_LEVELS } from 'n8n-workflow';
import { ensureStringArray } from './utils';

convict.addFormat({
	name: 'comma-separated-list',
	coerce: (rawStr: string) => rawStr.split(','),
	validate: ensureStringArray,
});

export const schema = {
	executions: {
		// TODO: remove this and all usage of `executions.process` when we're sure that nobody has this in their config file anymore.
		process: {
			doc: 'Deprecated key, that will be removed in the future. Please remove it from your configuration and environment variables to prevent issues in the future.',
			format: String,
			default: '',
			env: 'EXECUTIONS_PROCESS',
		},
		mode: {
			doc: 'If it should run executions directly or via queue',
			format: ['regular', 'queue'] as const,
			default: 'regular',
			env: 'EXECUTIONS_MODE',
		},

		concurrency: {
			productionLimit: {
				doc: "Max production executions allowed to run concurrently, in main process for regular mode and in worker for queue mode. Default for main mode is `-1` (disabled). Default for queue mode is taken from the worker's `--concurrency` flag.",
				format: Number,
				default: -1,
				env: 'N8N_CONCURRENCY_PRODUCTION_LIMIT',
			},
		},

		// A Workflow times out and gets canceled after this time (seconds).
		// If the workflow is executed in the main process a soft timeout
		// is executed (takes effect after the current node finishes).
		// If a workflow is running in its own process is a soft timeout
		// tried first, before killing the process after waiting for an
		// additional fifth of the given timeout duration.
		//
		// To deactivate timeout set it to -1
		//
		// Timeout is currently not activated by default which will change
		// in a future version.
		timeout: {
			doc: 'Max run time (seconds) before stopping the workflow execution',
			format: Number,
			default: -1,
			env: 'EXECUTIONS_TIMEOUT',
		},
		maxTimeout: {
			doc: 'Max execution time (seconds) that can be set for a workflow individually',
			format: Number,
			default: 3600,
			env: 'EXECUTIONS_TIMEOUT_MAX',
		},

		// If a workflow executes all the data gets saved by default. This
		// could be a problem when a workflow gets executed a lot and processes
		// a lot of data. To not exceed the database's capacity it is possible to
		// prune the database regularly or to not save the execution at all.
		// Depending on if the execution did succeed or error a different
		// save behaviour can be set.
		saveDataOnError: {
			doc: 'What workflow execution data to save on error',
			format: ['all', 'none'] as const,
			default: 'all',
			env: 'EXECUTIONS_DATA_SAVE_ON_ERROR',
		},
		saveDataOnSuccess: {
			doc: 'What workflow execution data to save on success',
			format: ['all', 'none'] as const,
			default: 'all',
			env: 'EXECUTIONS_DATA_SAVE_ON_SUCCESS',
		},
		saveExecutionProgress: {
			doc: 'Whether or not to save progress for each node executed',
			format: Boolean,
			default: false,
			env: 'EXECUTIONS_DATA_SAVE_ON_PROGRESS',
		},

		// If the executions of workflows which got started via the editor
		// should be saved. By default they will not be saved as this runs
		// are normally only for testing and debugging. This setting can
		// also be overwritten on a per workflow basis in the workflow settings
		// in the editor.
		saveDataManualExecutions: {
			doc: 'Save data of executions when started manually via editor',
			format: Boolean,
			default: true,
			env: 'EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS',
		},

		// To not exceed the database's capacity and keep its size moderate
		// the execution data gets pruned regularly (default: 15 minute interval).
		// All saved execution data older than the max age will be deleted.
		// Pruning is currently not activated by default, which will change in
		// a future version.
		pruneData: {
			doc: 'Delete data of past executions on a rolling basis',
			format: Boolean,
			default: true,
			env: 'EXECUTIONS_DATA_PRUNE',
		},
		pruneDataMaxAge: {
			doc: 'How old (hours) the finished execution data has to be to get soft-deleted',
			format: Number,
			default: 336,
			env: 'EXECUTIONS_DATA_MAX_AGE',
		},
		pruneDataHardDeleteBuffer: {
			doc: 'How old (hours) the finished execution data has to be to get hard-deleted. By default, this buffer excludes recent executions as the user may need them while building a workflow.',
			format: Number,
			default: 1,
			env: 'EXECUTIONS_DATA_HARD_DELETE_BUFFER',
		},
		pruneDataIntervals: {
			hardDelete: {
				doc: 'How often (minutes) execution data should be hard-deleted',
				format: Number,
				default: 15,
				env: 'EXECUTIONS_DATA_PRUNE_HARD_DELETE_INTERVAL',
			},
			softDelete: {
				doc: 'How often (minutes) execution data should be soft-deleted',
				format: Number,
				default: 60,
				env: 'EXECUTIONS_DATA_PRUNE_SOFT_DELETE_INTERVAL',
			},
		},

		// Additional pruning option to delete executions if total count exceeds the configured max.
		// Deletes the oldest entries first
		// Set to 0 for No limit
		pruneDataMaxCount: {
			doc: "Maximum number of finished executions to keep in DB. Doesn't necessarily prune exactly to max number. 0 = no limit",
			format: Number,
			default: 10000,
			env: 'EXECUTIONS_DATA_PRUNE_MAX_COUNT',
		},

		queueRecovery: {
			interval: {
				doc: 'How often (minutes) to check for queue recovery',
				format: Number,
				default: 180,
				env: 'N8N_EXECUTIONS_QUEUE_RECOVERY_INTERVAL',
			},
			batchSize: {
				doc: 'Size of batch of executions to check for queue recovery',
				format: Number,
				default: 100,
				env: 'N8N_EXECUTIONS_QUEUE_RECOVERY_BATCH',
			},
		},
	},

	queue: {
		health: {
			active: {
				doc: 'If health checks should be enabled',
				format: Boolean,
				default: false,
				env: 'QUEUE_HEALTH_CHECK_ACTIVE',
			},
			port: {
				doc: 'Port to serve health check on if activated',
				format: Number,
				default: 5678,
				env: 'QUEUE_HEALTH_CHECK_PORT',
			},
		},
		bull: {
			prefix: {
				doc: 'Prefix for all bull queue keys',
				format: String,
				default: 'bull',
				env: 'QUEUE_BULL_PREFIX',
			},
			redis: {
				db: {
					doc: 'Redis DB',
					format: Number,
					default: 0,
					env: 'QUEUE_BULL_REDIS_DB',
				},
				host: {
					doc: 'Redis Host',
					format: String,
					default: 'localhost',
					env: 'QUEUE_BULL_REDIS_HOST',
				},
				password: {
					doc: 'Redis Password',
					format: String,
					default: '',
					env: 'QUEUE_BULL_REDIS_PASSWORD',
				},
				port: {
					doc: 'Redis Port',
					format: Number,
					default: 6379,
					env: 'QUEUE_BULL_REDIS_PORT',
				},
				timeoutThreshold: {
					doc: 'Max cumulative timeout (in milliseconds) of connection retries before process exit',
					format: Number,
					default: 10000,
					env: 'QUEUE_BULL_REDIS_TIMEOUT_THRESHOLD',
				},
				username: {
					doc: 'Redis Username (needs Redis >= 6)',
					format: String,
					default: '',
					env: 'QUEUE_BULL_REDIS_USERNAME',
				},
				clusterNodes: {
					doc: 'Redis Cluster startup nodes (comma separated list of host:port pairs)',
					format: String,
					default: '',
					env: 'QUEUE_BULL_REDIS_CLUSTER_NODES',
				},
				tls: {
					format: Boolean,
					default: false,
					env: 'QUEUE_BULL_REDIS_TLS',
					doc: 'Enable TLS on Redis connections. Default: false',
				},
			},
			queueRecoveryInterval: {
				doc: 'If > 0 enables an active polling to the queue that can recover for Redis crashes. Given in seconds; 0 is disabled. May increase Redis traffic significantly.',
				format: Number,
				default: 60,
				env: 'QUEUE_RECOVERY_INTERVAL',
			},
			gracefulShutdownTimeout: {
				doc: '[DEPRECATED] (Use N8N_GRACEFUL_SHUTDOWN_TIMEOUT instead) How long should n8n wait for running executions before exiting worker process (seconds)',
				format: Number,
				default: 30,
				env: 'QUEUE_WORKER_TIMEOUT',
			},
			settings: {
				lockDuration: {
					doc: 'How long (ms) is the lease period for a worker to work on a message',
					format: Number,
					default: 30000,
					env: 'QUEUE_WORKER_LOCK_DURATION',
				},
				lockRenewTime: {
					doc: 'How frequently (ms) should a worker renew the lease time',
					format: Number,
					default: 15000,
					env: 'QUEUE_WORKER_LOCK_RENEW_TIME',
				},
				stalledInterval: {
					doc: 'How often check for stalled jobs (use 0 for never checking)',
					format: Number,
					default: 30000,
					env: 'QUEUE_WORKER_STALLED_INTERVAL',
				},
				maxStalledCount: {
					doc: 'Max amount of times a stalled job will be re-processed',
					format: Number,
					default: 1,
					env: 'QUEUE_WORKER_MAX_STALLED_COUNT',
				},
			},
		},
	},

	generic: {
		// The timezone to use. Is important for nodes like "Cron" which start the
		// workflow automatically at a specified time. This setting can also be
		// overwritten on a per workflow basis in the workflow settings in the
		// editor.
		timezone: {
			doc: 'The timezone to use',
			format: '*',
			default: 'America/New_York',
			env: 'GENERIC_TIMEZONE',
		},

		instanceType: {
			doc: 'Type of n8n instance',
			format: ['main', 'webhook', 'worker'] as const,
			default: 'main',
		},

		releaseChannel: {
			doc: 'N8N release channel',
			format: ['stable', 'beta', 'nightly', 'dev'] as const,
			default: 'dev',
			env: 'N8N_RELEASE_TYPE',
		},

		gracefulShutdownTimeout: {
			doc: 'How long should n8n process wait for components to shut down before exiting the process (seconds)',
			format: Number,
			default: 30,
			env: 'N8N_GRACEFUL_SHUTDOWN_TIMEOUT',
		},
	},

	secure_cookie: {
		doc: 'This sets the `Secure` flag on n8n auth cookie',
		format: Boolean,
		default: true,
		env: 'N8N_SECURE_COOKIE',
	},
	ssl_key: {
		format: String,
		default: '',
		env: 'N8N_SSL_KEY',
		doc: 'SSL Key for HTTPS Protocol',
	},
	ssl_cert: {
		format: String,
		default: '',
		env: 'N8N_SSL_CERT',
		doc: 'SSL Cert for HTTPS Protocol',
	},
	editorBaseUrl: {
		format: String,
		default: '',
		env: 'N8N_EDITOR_BASE_URL',
		doc: 'Public URL where the editor is accessible. Also used for emails sent from n8n.',
	},

	security: {
		restrictFileAccessTo: {
			doc: 'If set only files in that directories can be accessed. Multiple directories can be separated by semicolon (";").',
			format: String,
			default: '',
			env: 'N8N_RESTRICT_FILE_ACCESS_TO',
		},
		blockFileAccessToN8nFiles: {
			doc: 'If set to true it will block access to all files in the ".n8n" directory and user defined config files.',
			format: Boolean,
			default: true,
			env: 'N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES',
		},
		audit: {
			daysAbandonedWorkflow: {
				doc: 'Days for a workflow to be considered abandoned if not executed',
				format: Number,
				default: 90,
				env: 'N8N_SECURITY_AUDIT_DAYS_ABANDONED_WORKFLOW',
			},
		},
	},

	workflowTagsDisabled: {
		format: Boolean,
		default: false,
		env: 'N8N_WORKFLOW_TAGS_DISABLED',
		doc: 'Disable workflow tags.',
	},

	userManagement: {
		jwtSecret: {
			doc: 'Set a specific JWT secret (optional - n8n can generate one)', // Generated @ start.ts
			format: String,
			default: '',
			env: 'N8N_USER_MANAGEMENT_JWT_SECRET',
		},
		jwtSessionDurationHours: {
			doc: 'Set a specific expiration date for the JWTs in hours.',
			format: Number,
			default: 168,
			env: 'N8N_USER_MANAGEMENT_JWT_DURATION_HOURS',
		},
		jwtRefreshTimeoutHours: {
			doc: 'How long before the JWT expires to automatically refresh it. 0 means 25% of N8N_USER_MANAGEMENT_JWT_DURATION_HOURS. -1 means it will never refresh, which forces users to login again after the defined period in N8N_USER_MANAGEMENT_JWT_DURATION_HOURS.',
			format: Number,
			default: 0,
			env: 'N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS',
		},
		isInstanceOwnerSetUp: {
			// n8n loads this setting from DB on startup
			doc: "Whether the instance owner's account has been set up",
			format: Boolean,
			default: false,
		},
		authenticationMethod: {
			doc: 'How to authenticate users (e.g. "email", "ldap", "saml")',
			format: ['email', 'ldap', 'saml'] as const,
			default: 'email',
		},
	},

	externalFrontendHooksUrls: {
		doc: 'URLs to external frontend hooks files, ; separated',
		format: String,
		default: '',
		env: 'EXTERNAL_FRONTEND_HOOKS_URLS',
	},

	externalHookFiles: {
		doc: 'Files containing external hooks. Multiple files can be separated by colon (":")',
		format: String,
		default: '',
		env: 'EXTERNAL_HOOK_FILES',
	},

	logs: {
		level: {
			doc: 'Log output level',
			format: LOG_LEVELS,
			default: 'info',
			env: 'N8N_LOG_LEVEL',
		},
		output: {
			doc: 'Where to output logs. Options are: console, file. Multiple can be separated by comma (",")',
			format: String,
			default: 'console',
			env: 'N8N_LOG_OUTPUT',
		},
		file: {
			fileCountMax: {
				doc: 'Maximum number of files to keep.',
				format: Number,
				default: 100,
				env: 'N8N_LOG_FILE_COUNT_MAX',
			},
			fileSizeMax: {
				doc: 'Maximum size for each log file in MB.',
				format: Number,
				default: 16,
				env: 'N8N_LOG_FILE_SIZE_MAX',
			},
			location: {
				doc: 'Log file location; only used if log output is set to file.',
				format: String,
				default: path.join(Container.get(InstanceSettings).n8nFolder, 'logs/n8n.log'),
				env: 'N8N_LOG_FILE_LOCATION',
			},
		},
	},

	push: {
		backend: {
			format: ['sse', 'websocket'] as const,
			default: 'websocket',
			env: 'N8N_PUSH_BACKEND',
			doc: 'Backend to use for push notifications',
		},
	},

	binaryDataManager: {
		availableModes: {
			format: 'comma-separated-list',
			default: 'filesystem',
			env: 'N8N_AVAILABLE_BINARY_DATA_MODES',
			doc: 'Available modes of binary data storage, as comma separated strings',
		},
		mode: {
			format: ['default', 'filesystem', 's3'] as const,
			default: 'default',
			env: 'N8N_DEFAULT_BINARY_DATA_MODE',
			doc: 'Storage mode for binary data',
		},
		localStoragePath: {
			format: String,
			default: path.join(Container.get(InstanceSettings).n8nFolder, 'binaryData'),
			env: 'N8N_BINARY_DATA_STORAGE_PATH',
			doc: 'Path for binary data storage in "filesystem" mode',
		},
	},

	deployment: {
		type: {
			format: String,
			default: 'default',
			env: 'N8N_DEPLOYMENT_TYPE',
		},
	},

	mfa: {
		enabled: {
			format: Boolean,
			default: true,
			doc: 'Whether to enable MFA feature in instance.',
			env: 'N8N_MFA_ENABLED',
		},
	},

	sso: {
		justInTimeProvisioning: {
			format: Boolean,
			default: true,
			doc: 'Whether to automatically create users when they login via SSO.',
		},
		redirectLoginToSso: {
			format: Boolean,
			default: true,
			doc: 'Whether to automatically redirect users from login dialog to initialize SSO flow.',
		},
		saml: {
			loginEnabled: {
				format: Boolean,
				default: false,
				doc: 'Whether to enable SAML SSO.',
			},
			loginLabel: {
				format: String,
				default: '',
			},
		},
		ldap: {
			loginEnabled: {
				format: Boolean,
				default: false,
			},
			loginLabel: {
				format: String,
				default: '',
			},
		},
	},

	hiringBanner: {
		enabled: {
			doc: 'Whether hiring banner in browser console is enabled.',
			format: Boolean,
			default: true,
			env: 'N8N_HIRING_BANNER_ENABLED',
		},
	},

	personalization: {
		enabled: {
			doc: 'Whether personalization is enabled.',
			format: Boolean,
			default: true,
			env: 'N8N_PERSONALIZATION_ENABLED',
		},
	},

	diagnostics: {
		enabled: {
			doc: 'Whether diagnostic mode is enabled.',
			format: Boolean,
			default: true,
			env: 'N8N_DIAGNOSTICS_ENABLED',
		},
		config: {
			posthog: {
				apiKey: {
					doc: 'API key for PostHog',
					format: String,
					default: 'phc_4URIAm1uYfJO7j8kWSe0J8lc8IqnstRLS7Jx8NcakHo',
					env: 'N8N_DIAGNOSTICS_POSTHOG_API_KEY',
				},
				apiHost: {
					doc: 'API host for PostHog',
					format: String,
					default: 'https://ph.n8n.io',
					env: 'N8N_DIAGNOSTICS_POSTHOG_API_HOST',
				},
			},
			sentry: {
				dsn: {
					doc: 'Data source name for error tracking on Sentry',
					format: String,
					default: '',
					env: 'N8N_SENTRY_DSN',
				},
			},
			frontend: {
				doc: 'Diagnostics config for frontend.',
				format: String,
				default: '1zPn9bgWPzlQc0p8Gj1uiK6DOTn;https://telemetry.n8n.io',
				env: 'N8N_DIAGNOSTICS_CONFIG_FRONTEND',
			},
			backend: {
				doc: 'Diagnostics config for backend.',
				format: String,
				default: '1zPn7YoGC3ZXE9zLeTKLuQCB4F6;https://telemetry.n8n.io',
				env: 'N8N_DIAGNOSTICS_CONFIG_BACKEND',
			},
		},
	},

	defaultLocale: {
		doc: 'Default locale for the UI',
		format: String,
		default: 'en',
		env: 'N8N_DEFAULT_LOCALE',
	},

	license: {
		serverUrl: {
			format: String,
			default: 'https://license.n8n.io/v1',
			env: 'N8N_LICENSE_SERVER_URL',
			doc: 'License server url to retrieve license.',
		},
		autoRenewEnabled: {
			format: Boolean,
			default: true,
			env: 'N8N_LICENSE_AUTO_RENEW_ENABLED',
			doc: 'Whether auto renewal for licenses is enabled.',
		},
		autoRenewOffset: {
			format: Number,
			default: 60 * 60 * 72, // 72 hours
			env: 'N8N_LICENSE_AUTO_RENEW_OFFSET',
			doc: 'How many seconds before expiry a license should get automatically renewed. ',
		},
		activationKey: {
			format: String,
			default: '',
			env: 'N8N_LICENSE_ACTIVATION_KEY',
			doc: 'Activation key to initialize license',
		},
		tenantId: {
			format: Number,
			default: 1,
			env: 'N8N_LICENSE_TENANT_ID',
			doc: 'Tenant id used by the license manager',
		},
		cert: {
			format: String,
			default: '',
			env: 'N8N_LICENSE_CERT',
			doc: 'Ephemeral license certificate',
		},
	},

	hideUsagePage: {
		format: Boolean,
		default: false,
		env: 'N8N_HIDE_USAGE_PAGE',
		doc: 'Hide or show the usage page',
	},

	redis: {
		prefix: {
			doc: 'Prefix for all n8n related keys',
			format: String,
			default: 'n8n',
			env: 'N8N_REDIS_KEY_PREFIX',
		},
		queueModeId: {
			doc: 'Unique ID for this n8n instance, is usually set automatically by n8n during startup',
			format: String,
			default: '',
		},
	},

	cache: {
		backend: {
			doc: 'Backend to use for caching',
			format: ['memory', 'redis', 'auto'] as const,
			default: 'auto',
			env: 'N8N_CACHE_BACKEND',
		},
		memory: {
			maxSize: {
				doc: 'Maximum size of memory cache in bytes',
				format: Number,
				default: 3 * 1024 * 1024, // 3 MB
				env: 'N8N_CACHE_MEMORY_MAX_SIZE',
			},
			ttl: {
				doc: 'Time to live for cached items in memory (in ms)',
				format: Number,
				default: 3600 * 1000, // 1 hour
				env: 'N8N_CACHE_MEMORY_TTL',
			},
		},
		redis: {
			prefix: {
				doc: 'Prefix for all cache keys',
				format: String,
				default: 'cache',
				env: 'N8N_CACHE_REDIS_KEY_PREFIX',
			},
			ttl: {
				doc: 'Time to live for cached items in redis (in ms), 0 for no TTL',
				format: Number,
				default: 3600 * 1000, // 1 hour
				env: 'N8N_CACHE_REDIS_TTL',
			},
		},
	},

	ai: {
		enabled: {
			doc: 'Whether AI features are enabled',
			format: Boolean,
			default: false,
			env: 'N8N_AI_ENABLED',
		},
	},

	expression: {
		evaluator: {
			doc: 'Expression evaluator to use',
			format: ['tmpl', 'tournament'] as const,
			default: 'tournament',
			env: 'N8N_EXPRESSION_EVALUATOR',
		},
		reportDifference: {
			doc: 'Whether to report differences in the evaluator outputs',
			format: Boolean,
			default: false,
			env: 'N8N_EXPRESSION_REPORT_DIFFERENCE',
		},
	},

	sourceControl: {
		defaultKeyPairType: {
			doc: 'Default SSH key type to use when generating SSH keys',
			format: ['rsa', 'ed25519'] as const,
			default: 'ed25519',
			env: 'N8N_SOURCECONTROL_DEFAULT_SSH_KEY_TYPE',
		},
	},

	workflowHistory: {
		enabled: {
			doc: 'Whether to save workflow history versions',
			format: Boolean,
			default: true,
			env: 'N8N_WORKFLOW_HISTORY_ENABLED',
		},

		pruneTime: {
			doc: 'Time (in hours) to keep workflow history versions for',
			format: Number,
			default: -1,
			env: 'N8N_WORKFLOW_HISTORY_PRUNE_TIME',
		},
	},

	instanceRole: {
		doc: 'Always `leader` in single-main setup. `leader` or `follower` in multi-main setup.',
		format: ['unset', 'leader', 'follower'] as const,
		default: 'unset', // only until Start.initOrchestration
	},

	multiMainSetup: {
		enabled: {
			doc: 'Whether to enable multi-main setup for queue mode (license required)',
			format: Boolean,
			default: false,
			env: 'N8N_MULTI_MAIN_SETUP_ENABLED',
		},
		ttl: {
			doc: 'Time to live (in seconds) for leader key in multi-main setup',
			format: Number,
			default: 10,
			env: 'N8N_MULTI_MAIN_SETUP_KEY_TTL',
		},
		interval: {
			doc: 'Interval (in seconds) for leader check in multi-main setup',
			format: Number,
			default: 3,
			env: 'N8N_MULTI_MAIN_SETUP_CHECK_INTERVAL',
		},
	},

	proxy_hops: {
		format: Number,
		default: 0,
		env: 'N8N_PROXY_HOPS',
		doc: 'Number of reverse-proxies n8n is running behind',
	},
};
