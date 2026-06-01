package com.smartattend.ui.admin

import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.annotation.ColorRes
import androidx.annotation.DrawableRes
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.smartattend.databinding.ItemAdminActionBinding

data class AdminDashboardItem(
    val id: Int,
    val title: String,
    val subtitle: String,
    @DrawableRes val icon: Int,
    @ColorRes val iconBgColor: Int,
    val actionId: Int
)

class AdminDashboardAdapter(
    private val items: List<AdminDashboardItem>,
    private val onItemClick: (AdminDashboardItem) -> Unit
) : RecyclerView.Adapter<AdminDashboardAdapter.ViewHolder>() {

    inner class ViewHolder(private val binding: ItemAdminActionBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: AdminDashboardItem) {
            binding.tvTitle.text = item.title
            binding.tvSubtitle.text = item.subtitle
            binding.ivIcon.setImageResource(item.icon)
            
            val color = ContextCompat.getColor(binding.root.context, item.iconBgColor)
            binding.iconContainer.setCardBackgroundColor(ColorStateList.valueOf(color))
            
            binding.cardAction.setOnClickListener { onItemClick(item) }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemAdminActionBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount() = items.size
}
