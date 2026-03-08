module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Трансформирует import.meta в код, понятный Metro
      'babel-plugin-transform-import-meta',
      // Принудительно заменяет обращения к переменным окружения через import.meta на process.env
      [
        'babel-plugin-transform-define',
        {
          'import.meta.env': 'process.env',
        },
      ],
    ],
  };
};
