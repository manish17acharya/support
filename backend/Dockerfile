FROM php:8.2-fpm-alpine

# System deps + PHP extensions
RUN apk add --no-cache \
    mysql-client \
    zip unzip git curl \
    libzip-dev libpng-dev \
    && docker-php-ext-install pdo pdo_mysql zip opcache \
    && docker-php-ext-configure opcache --enable-opcache

# OPcache config for production
RUN echo "opcache.enable=1\nopcache.memory_consumption=128\nopcache.validate_timestamps=0" \
    > /usr/local/etc/php/conf.d/opcache.ini

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Install dependencies first (layer cache)
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction

# Copy application
COPY . .

RUN composer dump-autoload --optimize --no-dev \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 9000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["php-fpm"]
