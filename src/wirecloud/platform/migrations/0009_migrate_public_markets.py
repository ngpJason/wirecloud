# -*- coding: utf-8 -*-
# Generated by Django 1.11.1 on 2017-09-13 07:33
from django.db import migrations


def migrate_public_markets(apps, schema_editor):
    Market = apps.get_model('platform', 'Market')
    User = apps.get_model('auth', 'User')
    wirecloud_user = None

    for market in Market.objects.all():
        market.public = market.user is None

        if market.public:
            if wirecloud_user is None:
                wirecloud_user = User.objects.get(username="wirecloud")

            market.user = wirecloud_user

        market.save()


class Migration(migrations.Migration):

    dependencies = [
        ('platform', '0008_market_public'),
    ]

    operations = [
        migrations.RunPython(migrate_public_markets),
    ]
