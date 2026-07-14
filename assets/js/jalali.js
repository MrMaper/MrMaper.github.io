// Gregorian -> Jalali (Shamsi) date conversion for MrMaper site
// Algorithm: standard Gregorian to Persian calendar conversion.
(function (global) {
  'use strict';

  var persianMonths = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];
  var persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  function toPersianDigits(s) {
    return String(s).replace(/[0-9]/g, function (d) {
      return persianDigits[+d];
    });
  }

  // Convert a Date (or Date-like) to {y, m, d} Jalali
  function toJalali(gy, gm, gd) {
    if (gy instanceof Date) {
      gd = gy.getDate();
      gm = gy.getMonth() + 1;
      gy = gy.getFullYear();
    }
    var gDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var jDaysInMonth = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

    var gy2 = (gm > 2) ? (gy + 1) : gy;
    var days =
      355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) -
      Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) +
      gd + (gm > 2 ? 0 : -1) * 0;

    for (var i = 0; i < gm - 1; i++) days += gDaysInMonth[i];

    var jy = -1595 + 33 * Math.floor(days / 12053);
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
      jy += Math.floor((days - 1) / 365);
      days = (days - 1) % 365;
    }

    var jm, jd;
    if (days < 186) {
      jm = 1 + Math.floor(days / 31);
      jd = 1 + (days % 31);
    } else {
      jm = 7 + Math.floor((days - 186) / 30);
      jd = 1 + ((days - 186) % 30);
    }
    return { y: jy, m: jm, d: jd };
  }

  // Format a Date as "23 تیر 1405" (long) or "۱۴۰۵/۰۴/۲۳" (numeric)
  function formatLong(date) {
    var j = toJalali(date);
    return toPersianDigits(j.d) + ' ' + persianMonths[j.m - 1] + ' ' + toPersianDigits(j.y);
  }
  function formatNumeric(date) {
    var j = toJalali(date);
    function p2(n) { return (n < 10 ? '0' : '') + n; }
    return toPersianDigits(j.y) + '/' + toPersianDigits(p2(j.m)) + '/' + toPersianDigits(p2(j.d));
  }

  global.JalaliDate = {
    toJalali: toJalali,
    formatLong: formatLong,
    formatNumeric: formatNumeric,
    toPersianDigits: toPersianDigits,
    months: persianMonths
  };
})(window);