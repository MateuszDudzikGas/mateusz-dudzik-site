// main.js

let cart = JSON.parse(localStorage.getItem('cart')) || [];

function addToCart(productName, price) { cart.push({ name: productName, price }); localStorage.setItem('cart', JSON.stringify(cart)); updateCart(); }

function removeFromCart(index) { cart.splice(index, 1); localStorage.setItem('cart', JSON.stringify(cart)); updateCart(); }

function updateCart() { const cartBox = document.getElementById('cart'); if (!cartBox) return;

if (cart.length === 0) { cartBox.innerHTML = '<span>Your cart is empty.</span>'; } else { let html = '<h3>Shopping Cart</h3>'; let total = 0; cart.forEach((item, index) => { html += <span>${item.name} – £${item.price} <button onclick="removeFromCart(${index})">Remove</button></span>; total += item.price; }); html += <strong>Total: £${total}</strong>; html += '<div><a href="/checkout.html" class="btn-main">Checkout</a></div>'; cartBox.innerHTML = html; } }

document.addEventListener('DOMContentLoaded', updateCart);

