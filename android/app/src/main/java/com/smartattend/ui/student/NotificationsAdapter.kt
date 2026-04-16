package com.smartattend.ui.student

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.smartattend.R
import com.smartattend.domain.model.Notification

class NotificationsAdapter(
    private val onMarkRead: (Notification) -> Unit
) : ListAdapter<Notification, NotificationsAdapter.VH>(DIFF) {

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvTitle: TextView = view.findViewById(R.id.tvTitle)
        val tvMessage: TextView = view.findViewById(R.id.tvMessage)
        val tvTime: TextView = view.findViewById(R.id.tvTime)
        val tvType: TextView = view.findViewById(R.id.tvType)
        val viewUnread: View = view.findViewById(R.id.viewUnread)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_notification, parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = getItem(position)
        holder.tvTitle.text = item.title
        holder.tvMessage.text = item.message
        holder.tvTime.text = item.createdAt.take(10)
        holder.tvType.text = item.type.replace("_", " ").uppercase()
        holder.viewUnread.visibility = if (!item.isRead) View.VISIBLE else View.GONE

        if (!item.isRead) {
            holder.itemView.setBackgroundColor(
                ContextCompat.getColor(holder.itemView.context, R.color.blue_50)
            )
        } else {
            holder.itemView.setBackgroundColor(
                ContextCompat.getColor(holder.itemView.context, R.color.surface)
            )
        }

        holder.itemView.setOnClickListener {
            if (!item.isRead) onMarkRead(item)
        }
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<Notification>() {
            override fun areItemsTheSame(a: Notification, b: Notification) = a.id == b.id
            override fun areContentsTheSame(a: Notification, b: Notification) = a == b
        }
    }
}
