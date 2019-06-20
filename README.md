## [VKScripts Lite](https://vk.com/app6979558)

Позволяет запускать, сохранять и делиться VK API скриптами в формате [VKScript](https://vk.com/dev/execute).
В скриптах можно использовать функции из vk-connect, работу с DOM и прочие прелести нативного JavaScript

## TODO:
- Навести порядок (рефакторинг)
- Заменить [vk.js](https://vkscripts.ru/js/vk.js) на собственную библиотеку
- Добавить обработку ошибок api (captcha need)
- Убрать код из iframe.html
- Сделать песочницу для iframe
- Добавить новые TODO

## How To:
# На чем писать и как:
- vanilla JavaScript выполняется у вас в браузере, поэтому вы можете работать с DOM, XHR, setInterval итд
- vk.js - старая обертка для работы с VK API, которую использовали в vkscripts
- Обертка async + подстановка await

# Какие await методы есть?
- alert - VK UI обертка для отображения alert
- prompt - VK UI обертка для отображения prompt
- vk.auth - vk.connect обертка для вызова окна авторизации и подстановки access_token
- vk.users.get - vk._api обертка для вызова VK API
- vk.connect - vkui-connect-promise обертка для взаимодействия с VK Apps
- close - обертка, возвращающая входные данные и закрывающая вкладку (для разовых консольных скриптов)

# Безопасно?
- Зависит от кода, который вы запускаете. Код запускается не в sandbox, поэтому обращайте внимание на запускаемый код.

## ChangeLog:
1.1.1:
- обновления в документации
- fix vk.connect

1.1.0:
- Поддержка vk.connect
- Добавили параметры запуска (Args)
- Убрали лишние логи

1.0.0: Релиз

# Используемые библиотеки:
- @vkontakte/vkui
- [crypto-js](https://github.com/brix/crypto-js)
- [react](https://github.com/facebook/react)
- [acorn](https://github.com/acornjs/acorn)

